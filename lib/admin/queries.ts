import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import type {
  AdminBannerRow,
  AdminCategoryRow,
  AdminDashboardStats,
  AdminFlashSaleRow,
  AdminOrderRow,
  AdminProductRow,
  AdminShopRow,
  AdminUserRow,
  AdminVoucherRow,
} from "@/types/admin"

const PAGE_SIZE = 20

async function assertAdmin() {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== "ADMIN") throw new Error("Unauthorized")
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await assertAdmin()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    totalUsers,
    shopCounts,
    totalOrders,
    todayOrders,
    revenueAgg,
    recentOrders,
    pendingShopApplications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.shop.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "SHIPPED", "DELIVERED", "CANCELLED"] } },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
        shop: { select: { name: true } },
      },
    }),
    prisma.shop.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
        owner: { select: { email: true } },
      },
    }),
  ])

  const shopCountMap = Object.fromEntries(
    shopCounts.map((g) => [g.status, g._count._all])
  )

  return {
    totalUsers,
    totalShops:
      (shopCountMap["PENDING"] ?? 0) +
      (shopCountMap["ACTIVE"] ?? 0) +
      (shopCountMap["REJECTED"] ?? 0),
    activeShops: shopCountMap["ACTIVE"] ?? 0,
    pendingShops: shopCountMap["PENDING"] ?? 0,
    rejectedShops: shopCountMap["REJECTED"] ?? 0,
    totalOrders,
    todayOrders,
    totalRevenue: revenueAgg._sum.total ?? 0,
    recentOrders,
    pendingShopApplications,
  }
}

export async function getAdminShops(
  page: number,
  statusFilter: string | null
): Promise<{ shops: AdminShopRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const VALID_SHOP_STATUSES = ["PENDING", "ACTIVE", "REJECTED"]
  const where = statusFilter && VALID_SHOP_STATUSES.includes(statusFilter)
    ? { status: statusFilter as "PENDING" | "ACTIVE" | "REJECTED" }
    : {}
  const [shops, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        rejectionReason: true,
        owner: { select: { email: true } },
      },
    }),
    prisma.shop.count({ where }),
  ])
  return { shops, total, pageSize: PAGE_SIZE }
}

export async function getAdminUsers(
  page: number
): Promise<{ users: AdminUserRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, clerkId: true, createdAt: true },
    }),
    prisma.user.count(),
  ])
  return { users, total, pageSize: PAGE_SIZE }
}

export async function getAdminOrders(
  page: number,
  statusFilter: string | null,
  userId: string | null
): Promise<{ orders: AdminOrderRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const VALID_ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]
  const where: any = {}
  if (statusFilter && VALID_ORDER_STATUSES.includes(statusFilter)) where.status = statusFilter
  if (userId) where.userId = userId

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
        shop: { select: { name: true } },
      },
    }),
    prisma.order.count({ where }),
  ])
  return { orders, total, pageSize: PAGE_SIZE }
}

export async function getAdminProducts(
  page: number
): Promise<{ products: AdminProductRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        createdAt: true,
        shop: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.product.count(),
  ])
  return { products, total, pageSize: PAGE_SIZE }
}

export async function getAdminCategories(): Promise<AdminCategoryRow[]> {
  await assertAdmin()
  return prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      parentId: true,
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
  })
}

export async function getAdminBanners(): Promise<AdminBannerRow[]> {
  await assertAdmin()
  return prisma.banner.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true, imageUrl: true, title: true, linkUrl: true, displayOrder: true, isActive: true, createdAt: true },
  })
}

export async function getAdminVouchers(
  page: number
): Promise<{ vouchers: AdminVoucherRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, code: true, title: true, discountType: true, discountValue: true, minSpend: true, expiresAt: true, isActive: true },
    }),
    prisma.voucher.count(),
  ])
  return { vouchers, total, pageSize: PAGE_SIZE }
}

export async function getAdminFlashSales(): Promise<AdminFlashSaleRow[]> {
  await assertAdmin()
  return prisma.flashSale.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
      _count: { select: { items: true } },
    },
  })
}

export async function getAdminFlashSaleForEdit(id: string) {
  await assertAdmin()
  return prisma.flashSale.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, price: true } } },
      },
    },
  })
}

export async function searchAdminProducts(q: string) {
  await assertAdmin()
  return prisma.product.findMany({
    where: {
      OR: [{ name: { contains: q, mode: "insensitive" } }],
      isActive: true,
    },
    take: 20,
    select: { id: true, name: true, price: true, shop: { select: { name: true } } },
  })
}

export async function getAdminOrderDetail(orderId: string) {
  await assertAdmin()
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      shop: { select: { name: true } },
      address: true,
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { name: true } },
        },
      },
      payment: true,
      shipment: true,
    },
  })
}
