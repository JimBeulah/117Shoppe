import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { reconcileEligibleCommissions } from "@/lib/payouts/reconcile"
import { escalateExpiredReturnRequests } from "@/lib/orders/timeline"
import { releaseExpiredReservations } from "@/lib/inventory/reservations"
import type { DashboardStats } from "@/types/seller"
import type { ShopReviewWithProduct } from "@/types"
import type { SellerBalance, SellerPayoutRow } from "@/types/payouts"

export async function getCurrentShop() {
  const user = await getCurrentUser()
  if (!user) return null
  return prisma.shop.findUnique({ where: { ownerId: user.id } })
}

export async function getShopShippingMethods(shopId: string) {
  const [methods, links] = await Promise.all([
    prisma.shippingMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.shopShippingMethod.findMany({ where: { shopId } }),
  ])
  const linkByMethod = new Map(links.map((l) => [l.methodId, l.isEnabled]))
  return methods.map((m) => ({ ...m, isEnabled: linkByMethod.get(m.id) ?? false }))
}

export async function getDashboardStats(shopId: string): Promise<DashboardStats> {
  const [revenueAgg, totalOrders, activeProducts, pendingOrders, recentOrders, topProducts] =
    await Promise.all([
      prisma.order.aggregate({
        where: { shopId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { shopId } }),
      prisma.product.count({ where: { shopId, isActive: true } }),
      prisma.order.count({ where: { shopId, status: "PAID" } }),
      prisma.order.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.product.findMany({
        where: { shopId, isActive: true },
        orderBy: { sold: "desc" },
        take: 5,
        select: { id: true, name: true, images: true, sold: true, stock: true },
      }),
    ])

  return {
    totalRevenue: revenueAgg._sum.total ?? 0,
    totalOrders,
    activeProducts,
    pendingOrders,
    recentOrders,
    topProducts,
  }
}

export async function getSellerProducts(shopId: string, page: number, search?: string | null) {
  const PAGE_SIZE = 20
  const where: any = { shopId }
  if (search) {
    where.name = { contains: search, mode: "insensitive" }
  }
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        sold: true,
        isActive: true,
        status: true,
        rejectionReason: true,
        images: true,
      },
    }),
    prisma.product.count({ where }),
  ])
  return { products, total, pageSize: PAGE_SIZE }
}

export async function getSellerProductForEdit(productId: string, shopId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  })
  if (!product || product.shopId !== shopId) return null
  return product
}

export async function getSellerOrders(
  shopId: string,
  statusFilter: string | null,
  page: number,
  search?: string | null
) {
  await releaseExpiredReservations()

  const PAGE_SIZE = 20
  const where: any = { shopId }
  if (statusFilter) where.status = statusFilter as any
  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true } },
        items: {
          take: 2,
          include: {
            product: { select: { name: true } },
            variant: { select: { name: true } },
          },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ])
  return { orders, total, pageSize: PAGE_SIZE }
}

export async function getSellerOrderDetail(orderId: string, shopId: string) {
  await escalateExpiredReturnRequests()
  await releaseExpiredReservations()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true } },
      address: true,
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { name: true } },
        },
      },
      shipment: true,
      payment: true,
      refund: true,
      returnRequest: true,
      timelineEvents: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!order || order.shopId !== shopId) return null
  return order
}

export async function getAllCategories() {
  return prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  })
}

export async function getAllBrands() {
  return prisma.brand.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export async function getSellerBalance(shopId: string): Promise<SellerBalance> {
  await reconcileEligibleCommissions(shopId)

  const [pendingAgg, availableAgg, paidAgg, openPayout] = await Promise.all([
    prisma.commissionEntry.aggregate({
      where: { shopId, status: "PENDING" },
      _sum: { netAmount: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { shopId, status: "AVAILABLE" },
      _sum: { netAmount: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { shopId, status: "PAID" },
      _sum: { netAmount: true },
    }),
    prisma.payout.findFirst({
      where: { shopId, status: { in: ["REQUESTED", "PROCESSING"] } },
      select: { id: true },
    }),
  ])

  return {
    pending: pendingAgg._sum.netAmount ?? 0,
    available: availableAgg._sum.netAmount ?? 0,
    lifetimePaid: paidAgg._sum.netAmount ?? 0,
    hasOpenPayout: !!openPayout,
  }
}

export async function getSellerPayouts(
  shopId: string,
  page: number
): Promise<{ payouts: SellerPayoutRow[]; total: number; pageSize: number }> {
  const PAGE_SIZE = 20
  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where: { shopId },
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        amount: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        referenceNote: true,
      },
    }),
    prisma.payout.count({ where: { shopId } }),
  ])
  return { payouts, total, pageSize: PAGE_SIZE }
}

export async function getShopStaff(shopId: string) {
  return prisma.shopStaff.findMany({
    where: { shopId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      permissions: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  })
}

export async function getShopReviews(shopId: string): Promise<ShopReviewWithProduct[]> {
  return prisma.review.findMany({
    where: { product: { shopId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
      product: { select: { id: true, name: true, images: true } },
      reply: { select: { comment: true } },
    },
  })
}
