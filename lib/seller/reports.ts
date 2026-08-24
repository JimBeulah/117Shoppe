import { prisma } from "@/lib/db"
import type { DailySales, ReportTopProduct, SellerSalesReport } from "@/types/seller"

const REVENUE_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const

// Buckets a UTC Date into its Asia/Manila calendar day (YYYY-MM-DD).
// toISOString().slice(0,10) would bucket by UTC day, 8 hours off local PH time.
function toManilaDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

export async function getSellerSalesReport(
  shopId: string,
  from: Date,
  to: Date
): Promise<SellerSalesReport> {
  const orders = await prisma.order.findMany({
    where: {
      shopId,
      createdAt: { gte: from, lte: to },
      status: { in: [...REVENUE_STATUSES] },
    },
    select: { id: true, total: true, createdAt: true },
  })

  const dailyMap = new Map<string, DailySales>()
  for (const order of orders) {
    const key = toManilaDateKey(order.createdAt)
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
        shopId,
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

  const topProducts: ReportTopProduct[] = topItems
    .map((i) => {
      const product = productMap.get(i.productId)
      if (!product) return null
      return { id: product.id, name: product.name, images: product.images, sold: i.sold, revenue: i.revenue }
    })
    .filter((p): p is ReportTopProduct => p !== null)

  return { daily, totalRevenue, totalOrders, topProducts }
}

function csvEscape(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildDailySalesCsv(daily: DailySales[]): string {
  const header = ["Date", "Orders", "Revenue"]
  const rows = daily.map((d) => [d.date, d.orders, d.revenue])
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n")
}

export function buildTopProductsCsv(topProducts: ReportTopProduct[]): string {
  const header = ["Product", "Units Sold", "Revenue"]
  const rows = topProducts.map((p) => [p.name, p.sold, p.revenue])
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n")
}
