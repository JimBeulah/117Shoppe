import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import type {
  AdminDashboardStats,
  AdminShopRow,
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
  const where = statusFilter ? { status: statusFilter as any } : {}
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
