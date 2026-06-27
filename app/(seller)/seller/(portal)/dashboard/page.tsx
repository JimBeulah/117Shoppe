import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getDashboardStats } from "@/lib/seller/queries"
import SellerStatCard from "@/components/seller/SellerStatCard"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Seller Dashboard" }

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PAID: "To Ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const stats = await getDashboardStats(shop.id)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SellerStatCard label="Total Revenue" value={formatPrice(stats.totalRevenue)} />
        <SellerStatCard label="Total Orders" value={stats.totalOrders} />
        <SellerStatCard label="Products Listed" value={stats.activeProducts} />
        <SellerStatCard
          label="Pending Orders"
          value={stats.pendingOrders}
          sub="Need to ship"
          highlight={stats.pendingOrders > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary">Recent Orders</h2>
            <Link href="/seller/orders" className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border-default">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/seller/orders/${order.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-brand-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {order.user.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {order._count.items} item{order._count.items !== 1 ? "s" : ""} ·{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-PH")}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-semibold text-text-primary">
                        {formatPrice(order.total)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary">Top Products</h2>
            <Link href="/seller/products" className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No products yet.</p>
          ) : (
            <ul className="divide-y divide-border-default">
              {stats.topProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded border border-border-default flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-brand-50 rounded border border-border-default flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{product.name}</p>
                    <p className="text-xs text-text-secondary">{product.sold} sold</p>
                  </div>
                  <p
                    className={`text-xs font-medium flex-shrink-0 ${
                      product.stock <= 5 ? "text-orange-500" : "text-text-secondary"
                    }`}
                  >
                    {product.stock} left
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
