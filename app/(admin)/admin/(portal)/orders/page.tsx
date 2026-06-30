import Link from "next/link"
import { getAdminOrders } from "@/lib/admin/queries"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import { formatPrice } from "@/lib/utils"
import { SearchInput } from "@/components/ui/SearchInput"

export const metadata = { title: "Admin — Orders" }

const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]

interface Props {
  searchParams: Promise<{ page?: string; status?: string; userId?: string; search?: string }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { page: pageStr, status: statusParam, userId, search } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const statusFilter = statusParam ?? null
  const searchQuery = search ?? null

  const { orders, total, pageSize } = await getAdminOrders(page, statusFilter, userId ?? null, searchQuery)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { status?: string | null; userId?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const s = "status" in overrides ? overrides.status : statusFilter
    const u = "userId" in overrides ? overrides.userId : (userId ?? null)
    const p = overrides.page ?? page
    const q = searchQuery
    if (s) params.set("status", s)
    if (u) params.set("userId", u)
    if (q) params.set("search", q)
    if (p > 1) params.set("page", String(p))
    return `/admin/orders${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Orders</h1>
        <SearchInput placeholder="Search orders by ID, buyer, or shop..." />
      </div>

      {/* Status filter pills */}
      <div className="flex gap-1 flex-wrap items-center">
        <Link
          href={buildHref({ status: null, page: 1 })}
          className={`text-xs px-3 py-1 rounded border ${
            !statusFilter
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border-default text-text-secondary hover:bg-brand-50"
          }`}
        >
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, page: 1 })}
            className={`text-xs px-3 py-1 rounded border ${
              statusFilter === s
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border-default text-text-secondary hover:bg-brand-50"
            }`}
          >
            {s}
          </Link>
        ))}
        <span className="ml-2 text-xs text-text-secondary">{total} orders</span>
        {userId && (
          <Link
            href={buildHref({ userId: null, page: 1 })}
            className="ml-2 text-xs text-brand-600 hover:underline"
          >
            Clear user filter ×
          </Link>
        )}
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
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Order ID</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Total</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    #{order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{order.user.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{order.shop.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(order.createdAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
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
