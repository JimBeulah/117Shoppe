import { getAdminDashboardStats } from "@/lib/admin/queries"
import AdminStatCard from "@/components/admin/AdminStatCard"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"

export const metadata = { title: "Admin Dashboard" }

async function approveShopInline(shopId: string) {
  "use server"
  const { prisma } = await import("@/lib/db")
  const { clerkClient, auth } = await import("@clerk/nextjs/server")
  const { revalidatePath } = await import("next/cache")

  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== "ADMIN") throw new Error("Unauthorized")

  // Find the shop owner's clerkId
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { ownerId: true, owner: { select: { clerkId: true } } },
  })
  if (!shop) throw new Error("Shop not found")

  // Update shop status and user role in DB atomically
  await prisma.$transaction([
    prisma.shop.update({ where: { id: shopId }, data: { status: "ACTIVE" } }),
    prisma.user.update({ where: { id: shop.ownerId }, data: { role: "SELLER" } }),
  ])

  // Sync role to Clerk metadata
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(shop.owner.clerkId, {
    publicMetadata: { role: "SELLER" },
  })

  revalidatePath("/admin/dashboard")
}

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
            <ul className="divide-y divide-border-default">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-brand-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{order.user.name}</p>
                      <p className="text-xs text-text-secondary">
                        {order.shop.name} · {new Date(order.createdAt).toLocaleDateString("en-PH")}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-semibold text-text-primary">
                        {formatPrice(order.total)}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
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
                    <p className="text-sm font-medium text-text-primary">{shop.name}</p>
                    <p className="text-xs text-text-secondary">
                      {shop.owner.email} · {new Date(shop.createdAt).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <form
                      action={async () => {
                        "use server"
                        await approveShopInline(shop.id)
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </form>
                    <Link
                      href={`/admin/sellers?highlight=${shop.id}`}
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
