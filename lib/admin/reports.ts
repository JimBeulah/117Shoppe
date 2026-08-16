import { prisma } from "@/lib/db"
import { assertAdmin } from "@/lib/admin/actions"

export interface DailySales {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  id: string
  name: string
  images: string[]
  sold: number
  revenue: number
}

export interface SalesReport {
  daily: DailySales[]
  totalRevenue: number
  totalOrders: number
  topProducts: TopProduct[]
}

const REVENUE_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const

export async function getSalesReport(from: Date, to: Date): Promise<SalesReport> {
  await assertAdmin()

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: [...REVENUE_STATUSES] },
    },
    select: { id: true, total: true, createdAt: true },
  })

  const dailyMap = new Map<string, DailySales>()
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10)
    const entry = dailyMap.get(key) ?? { date: key, revenue: 0, orders: 0 }
    entry.revenue += order.total
    entry.orders += 1
    dailyMap.set(key, entry)
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const totalOrders = orders.length

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: from, lte: to },
        status: { in: [...REVENUE_STATUSES] },
      },
    },
    select: { productId: true, quantity: true, price: true },
  })

  const itemMap = new Map<string, { sold: number; revenue: number }>()
  for (const item of orderItems) {
    const entry = itemMap.get(item.productId) ?? { sold: 0, revenue: 0 }
    entry.sold += item.quantity
    entry.revenue += item.price * item.quantity
    itemMap.set(item.productId, entry)
  }

  const topItems = Array.from(itemMap.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10)

  const products = await prisma.product.findMany({
    where: { id: { in: topItems.map((i) => i.productId) } },
    select: { id: true, name: true, images: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const topProducts: TopProduct[] = topItems
    .map((i) => {
      const product = productMap.get(i.productId)
      if (!product) return null
      return { id: product.id, name: product.name, images: product.images, sold: i.sold, revenue: i.revenue }
    })
    .filter((p): p is TopProduct => p !== null)

  return { daily, totalRevenue, totalOrders, topProducts }
}
