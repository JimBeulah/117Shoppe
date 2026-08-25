import { prisma } from "@/lib/db"
import { assertAdmin } from "@/lib/admin/actions"
import { buildCsv } from "@/lib/reports/csv"

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

export interface CustomerRow {
  id: string
  name: string
  email: string
  orders: number
  totalSpent: number
}

export interface CustomerReport {
  topCustomers: CustomerRow[]
  newCustomers: number
  returningCustomers: number
  totalCustomers: number
}

export interface StoreComparisonRow {
  id: string
  name: string
  rating: number
  revenue: number
  orders: number
  commission: number
  netPayable: number
}

export interface ConversionProductRow {
  id: string
  name: string
  views: number
  addsToCart: number
  purchases: number
  conversionRate: number
}

export interface ConversionReport {
  views: number
  addsToCart: number
  purchases: number
  viewToCartRate: number
  cartToPurchaseRate: number
  overallConversionRate: number
  topProducts: ConversionProductRow[]
}

export interface ProductReportRow {
  id: string
  name: string
  images: string[]
  sold: number
  revenue: number
  currentStock: number
  restockedUnits: number
  cancelledUnits: number
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

export async function getCustomerReport(from: Date, to: Date): Promise<CustomerReport> {
  await assertAdmin()

  const byCustomer = await prisma.order.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: from, lte: to }, status: { in: [...REVENUE_STATUSES] } },
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

export async function getProductReport(from: Date, to: Date): Promise<ProductReportRow[]> {
  await assertAdmin()

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
    .slice(0, 50)

  const productIds = topItems.map((i) => i.productId)

  const [products, stockMovements] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, images: true, stock: true },
    }),
    prisma.stockMovement.groupBy({
      by: ["productId", "type"],
      where: { productId: { in: productIds }, createdAt: { gte: from, lte: to } },
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

export async function getStoreComparisonReport(from: Date, to: Date): Promise<StoreComparisonRow[]> {
  await assertAdmin()

  const [byShop, commissionByShop] = await Promise.all([
    prisma.order.groupBy({
      by: ["shopId"],
      where: { createdAt: { gte: from, lte: to }, status: { in: [...REVENUE_STATUSES] } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.commissionEntry.groupBy({
      by: ["shopId"],
      where: { createdAt: { gte: from, lte: to } },
      _sum: { commissionAmount: true, netAmount: true },
    }),
  ])

  const commissionMap = new Map(commissionByShop.map((c) => [c.shopId, c]))

  const sorted = [...byShop].sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0)).slice(0, 50)

  const shops = await prisma.shop.findMany({
    where: { id: { in: sorted.map((s) => s.shopId) } },
    select: { id: true, name: true, rating: true },
  })
  const shopMap = new Map(shops.map((s) => [s.id, s]))

  return sorted
    .map((s) => {
      const shop = shopMap.get(s.shopId)
      if (!shop) return null
      const commission = commissionMap.get(s.shopId)
      return {
        id: shop.id,
        name: shop.name,
        rating: shop.rating,
        revenue: s._sum.total ?? 0,
        orders: s._count._all,
        commission: commission?._sum.commissionAmount ?? 0,
        netPayable: commission?._sum.netAmount ?? 0,
      }
    })
    .filter((s): s is StoreComparisonRow => s !== null)
}

async function getConversionTopProducts(from: Date, to: Date, shopId?: string): Promise<ConversionProductRow[]> {
  const scopeFilter = shopId ? { shopId } : {}

  const [views, carts, purchases] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "PRODUCT_VIEW", createdAt: { gte: from, lte: to }, productId: { not: null }, ...scopeFilter },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "ADD_TO_CART", createdAt: { gte: from, lte: to }, productId: { not: null }, ...scopeFilter },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "PURCHASE", createdAt: { gte: from, lte: to }, productId: { not: null }, ...scopeFilter },
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

export async function getConversionReport(from: Date, to: Date): Promise<ConversionReport> {
  await assertAdmin()

  const [viewSessions, cartUsers, purchaseOrders] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["sessionId"], where: { type: "PRODUCT_VIEW", createdAt: { gte: from, lte: to } } }),
    prisma.analyticsEvent.groupBy({ by: ["userId"], where: { type: "ADD_TO_CART", createdAt: { gte: from, lte: to } } }),
    prisma.analyticsEvent.groupBy({ by: ["orderId"], where: { type: "PURCHASE", createdAt: { gte: from, lte: to } } }),
  ])

  const views = viewSessions.length
  const addsToCart = cartUsers.length
  const purchases = purchaseOrders.length

  const topProducts = await getConversionTopProducts(from, to)

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

export function buildTopProductsCsv(topProducts: TopProduct[]): string {
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

export function buildStoreComparisonCsv(stores: StoreComparisonRow[]): string {
  return buildCsv(
    ["Shop", "Rating", "Revenue", "Orders", "Commission", "Net Payable"],
    stores.map((s) => [s.name, s.rating, s.revenue, s.orders, s.commission, s.netPayable])
  )
}

export function buildConversionCsv(products: ConversionProductRow[]): string {
  return buildCsv(
    ["Product", "Views", "Adds to Cart", "Purchases", "Conversion Rate"],
    products.map((p) => [p.name, p.views, p.addsToCart, p.purchases, `${(p.conversionRate * 100).toFixed(2)}%`])
  )
}
