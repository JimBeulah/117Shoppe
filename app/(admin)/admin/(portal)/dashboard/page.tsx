import { getAdminDashboardStats } from "@/lib/admin/queries"
import { approveShop } from "@/lib/admin/actions"
import AdminStatCard from "@/components/admin/AdminStatCard"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import ShopStatusBadge from "@/components/admin/ShopStatusBadge"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"

export const metadata = { title: "Admin Dashboard" }

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Users" value={stats.totalUsers} />
        <AdminStatCard
          label="Total Shops"
          value={stats.totalShops}
          sub={`${stats.activeShops} active · ${stats.pendingShops} pending · ${stats.rejectedShops} rejected`}
        />
        <AdminStatCard
          label="Total Orders"
          value={stats.totalOrders}
          sub={`${stats.todayOrders} today`}
        />
        <AdminStatCard
          label="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle border-b border-border-default">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Order ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Buyer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Shop</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-text-secondary hover:underline">
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">{order.user.name}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{order.shop.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-text-primary">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{new Date(order.createdAt).toLocaleDateString("en-PH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending Seller Applications */}
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary">Pending Seller Applications</h2>
            <Link
              href="/admin/sellers?status=PENDING"
              className="text-xs text-brand-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {stats.pendingShopApplications.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No pending applications.</p>
          ) : (
            <ul className="divide-y divide-border-default">
              {stats.pendingShopApplications.map((shop) => (
                <li key={shop.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{shop.name}</p>
                      <ShopStatusBadge status="PENDING" />
                    </div>
                    <p className="text-xs text-text-secondary">
                      {shop.owner.email} · {new Date(shop.createdAt).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <form
                      action={async (fd: FormData) => {
                        "use server"
                        await approveShop(fd.get("shopId") as string)
                      }}
                    >
                      <input type="hidden" name="shopId" value={shop.id} />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </form>
                    <Link
                      href="/admin/sellers?status=PENDING"
                      className="text-xs px-2 py-1 border border-border-default rounded text-text-secondary hover:bg-brand-50"
                    >
                      Reject
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
