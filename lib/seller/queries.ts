import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import type { DashboardStats } from "@/types/seller"
import type { ShopReviewWithProduct } from "@/types"

export async function getCurrentShop() {
  const user = await getCurrentUser()
  if (!user) return null
  return prisma.shop.findUnique({ where: { ownerId: user.id } })
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
