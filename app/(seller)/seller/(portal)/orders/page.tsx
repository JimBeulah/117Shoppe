import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getSellerOrders } from "@/lib/seller/queries"
import { formatPrice } from "@/lib/utils"
import { SearchInput } from "@/components/ui/SearchInput"

export const metadata = { title: "Orders" }

const TABS = [
  { label: "All", value: null },
  { label: "To Ship", value: "PAID" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
]

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

interface Props {
  searchParams: Promise<{ status?: string; page?: string; search?: string }>
}

export default async function OrdersPage({ searchParams }: Props) {
  const { status: statusParam, page: pageStr, search } = await searchParams
  const statusFilter = statusParam ?? null
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const searchQuery = search ?? null

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const { orders, total, pageSize } = await getSellerOrders(shop.id, statusFilter, page, searchQuery)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { status?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const s = "status" in overrides ? overrides.status : statusFilter
    const p = overrides.page ?? page
    const q = searchQuery
    if (s) params.set("status", s)
    if (q) params.set("search", q)
    if (p > 1) params.set("page", String(p))
    return `/seller/orders${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Orders</h1>
        <SearchInput placeholder="Search orders by ID or buyer name..." />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-border-default">
        {TABS.map((tab) => {
          const href = buildHref({ status: tab.value, page: 1 })
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                active
                  ? "border-brand-600 text-brand-600 font-medium"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Order</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Items</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Total</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {orders.map((order) => {
                const firstItem = order.items[0]
                const itemSummary = firstItem
                  ? `${firstItem.product.name}${firstItem.variant ? ` (${firstItem.variant.name})` : ""}${
                      order._count.items > 1 ? ` + ${order._count.items - 1} more` : ""
                    }`
                  : "—"

                return (
                  <tr key={order.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-text-secondary">
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("en-PH")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{order.user.name}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-[200px]">
                      <p className="truncate text-xs">{itemSummary}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text-primary">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/seller/orders/${order.id}`}
                        className={`text-xs font-medium ${
                          order.status === "PAID"
                            ? "text-brand-600 hover:underline"
                            : "text-text-secondary hover:underline"
                        }`}
                      >
                        {order.status === "PAID" ? "Arrange Shipment" : "View"}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildHref({ page: page - 1 })}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildHref({ page: page + 1 })}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
