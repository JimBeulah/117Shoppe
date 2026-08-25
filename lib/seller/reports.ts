import { prisma } from "@/lib/db"
import { buildCsv } from "@/lib/reports/csv"
import type {
  ConversionProductRow,
  CustomerRow,
  DailySales,
  ProductReportRow,
  ReportTopProduct,
  SellerConversionReport,
  SellerCustomerReport,
  SellerSalesReport,
} from "@/types/seller"

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

export async function getSellerCustomerReport(
  shopId: string,
  from: Date,
  to: Date
): Promise<SellerCustomerReport> {
  const byCustomer = await prisma.order.groupBy({
    by: ["userId"],
    where: { shopId, createdAt: { gte: from, lte: to }, status: { in: [...REVENUE_STATUSES] } },
    _sum: { total: true },
    _count: { _all: true },
  })

  const totalCustomers = byCustomer.length

  const topRows = [...byCustomer]
    .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
    .slice(0, 10)

  const users = await prisma.user.findMany({
    where: { id: { in: topRows.map((r) => r.userId) } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const topCustomers: CustomerRow[] = topRows
    .map((r) => {
      const user = userMap.get(r.userId)
      if (!user) return null
      return { id: user.id, name: user.name, email: user.email, orders: r._count._all, totalSpent: r._sum.total ?? 0 }
    })
    .filter((c): c is CustomerRow => c !== null)

  const priorOrders = await prisma.order.groupBy({
    by: ["userId"],
    where: {
      shopId,
      userId: { in: byCustomer.map((r) => r.userId) },
      createdAt: { lt: from },
      status: { in: [...REVENUE_STATUSES] },
    },
    _count: { _all: true },
  })
  const returningIds = new Set(priorOrders.map((r) => r.userId))

  const returningCustomers = byCustomer.filter((r) => returningIds.has(r.userId)).length
  const newCustomers = totalCustomers - returningCustomers

  return { topCustomers, newCustomers, returningCustomers, totalCustomers }
}

export async function getSellerProductReport(
  shopId: string,
  from: Date,
  to: Date
): Promise<ProductReportRow[]> {
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
    .slice(0, 50)

  const productIds = topItems.map((i) => i.productId)

  const [products, stockMovements] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, images: true, stock: true },
    }),
    prisma.stockMovement.groupBy({
      by: ["productId", "type"],
      where: { shopId, productId: { in: productIds }, createdAt: { gte: from, lte: to } },
      _sum: { delta: true },
    }),
  ])
  const productMap = new Map(products.map((p) => [p.id, p]))

  const restockByProduct = new Map<string, number>()
  const cancelByProduct = new Map<string, number>()
  for (const m of stockMovements) {
    if (m.type === "RESTOCK_IN") restockByProduct.set(m.productId, (restockByProduct.get(m.productId) ?? 0) + (m._sum.delta ?? 0))
    if (m.type === "CANCELLATION_RESTOCK") cancelByProduct.set(m.productId, (cancelByProduct.get(m.productId) ?? 0) + (m._sum.delta ?? 0))
  }

  return topItems
    .map((i) => {
      const product = productMap.get(i.productId)
      if (!product) return null
      return {
        id: product.id,
        name: product.name,
        images: product.images,
        sold: i.sold,
        revenue: i.revenue,
        currentStock: product.stock,
        restockedUnits: restockByProduct.get(i.productId) ?? 0,
        cancelledUnits: cancelByProduct.get(i.productId) ?? 0,
      }
    })
    .filter((p): p is ProductReportRow => p !== null)
}

export async function getSellerStoreRank(
  shopId: string,
  from: Date,
  to: Date
): Promise<{ revenue: number; rank: number; totalShops: number }> {
  const byShop = await prisma.order.groupBy({
    by: ["shopId"],
    where: { createdAt: { gte: from, lte: to }, status: { in: [...REVENUE_STATUSES] } },
    _sum: { total: true },
  })

  const totalShops = byShop.length
  const thisShop = byShop.find((s) => s.shopId === shopId)
  const revenue = thisShop?._sum.total ?? 0
  const rank = byShop.filter((s) => (s._sum.total ?? 0) > revenue).length + 1

  return { revenue, rank, totalShops }
}

async function getSellerConversionTopProducts(
  shopId: string,
  from: Date,
  to: Date
): Promise<ConversionProductRow[]> {
  const [views, carts, purchases] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "PRODUCT_VIEW", createdAt: { gte: from, lte: to }, productId: { not: null }, shopId },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "ADD_TO_CART", createdAt: { gte: from, lte: to }, productId: { not: null }, shopId },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "PURCHASE", createdAt: { gte: from, lte: to }, productId: { not: null }, shopId },
      _count: { _all: true },
    }),
  ])

  const viewMap = new Map(views.map((v) => [v.productId as string, v._count._all]))
  const cartMap = new Map(carts.map((c) => [c.productId as string, c._count._all]))
  const purchaseMap = new Map(purchases.map((p) => [p.productId as string, p._count._all]))

  const topProductIds = Array.from(viewMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  const products = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  return topProductIds
    .map((id) => {
      const product = productMap.get(id)
      if (!product) return null
      const v = viewMap.get(id) ?? 0
      const p = purchaseMap.get(id) ?? 0
      return {
        id,
        name: product.name,
        views: v,
        addsToCart: cartMap.get(id) ?? 0,
        purchases: p,
        conversionRate: v > 0 ? p / v : 0,
      }
    })
    .filter((r): r is ConversionProductRow => r !== null)
}

export async function getSellerConversionReport(
  shopId: string,
  from: Date,
  to: Date
): Promise<SellerConversionReport> {
  const [viewSessions, cartUsers, purchaseOrders] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["sessionId"],
      where: { type: "PRODUCT_VIEW", createdAt: { gte: from, lte: to }, shopId },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["userId"],
      where: { type: "ADD_TO_CART", createdAt: { gte: from, lte: to }, shopId },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["orderId"],
      where: { type: "PURCHASE", createdAt: { gte: from, lte: to }, shopId },
    }),
  ])

  const views = viewSessions.length
  const addsToCart = cartUsers.length
  const purchases = purchaseOrders.length

  const topProducts = await getSellerConversionTopProducts(shopId, from, to)

  return {
    views,
    addsToCart,
    purchases,
    viewToCartRate: views > 0 ? addsToCart / views : 0,
    cartToPurchaseRate: addsToCart > 0 ? purchases / addsToCart : 0,
    overallConversionRate: views > 0 ? purchases / views : 0,
    topProducts,
  }
}

export function buildDailySalesCsv(daily: DailySales[]): string {
  return buildCsv(["Date", "Orders", "Revenue"], daily.map((d) => [d.date, d.orders, d.revenue]))
}

export function buildTopProductsCsv(topProducts: ReportTopProduct[]): string {
  return buildCsv(["Product", "Units Sold", "Revenue"], topProducts.map((p) => [p.name, p.sold, p.revenue]))
}

export function buildCustomersCsv(customers: CustomerRow[]): string {
  return buildCsv(
    ["Customer", "Email", "Orders", "Total Spent"],
    customers.map((c) => [c.name, c.email, c.orders, c.totalSpent])
  )
}

export function buildProductReportCsv(products: ProductReportRow[]): string {
  return buildCsv(
    ["Product", "Units Sold", "Revenue", "Current Stock", "Restocked", "Cancelled"],
    products.map((p) => [p.name, p.sold, p.revenue, p.currentStock, p.restockedUnits, p.cancelledUnits])
  )
}

export function buildConversionCsv(products: ConversionProductRow[]): string {
  return buildCsv(
    ["Product", "Views", "Adds to Cart", "Purchases", "Conversion Rate"],
    products.map((p) => [p.name, p.views, p.addsToCart, p.purchases, `${(p.conversionRate * 100).toFixed(2)}%`])
  )
}
