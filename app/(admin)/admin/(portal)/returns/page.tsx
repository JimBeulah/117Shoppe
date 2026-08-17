import Link from "next/link"
import { getAdminReturnRequestList } from "@/lib/admin/returns"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Admin — Returns" }

const STATUSES = [
  "PENDING_SELLER",
  "SELLER_APPROVED",
  "SELLER_REJECTED",
  "ADMIN_REVIEW",
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "CANCELLED",
  "COMPLETED",
]

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>
}

export default async function AdminReturnsPage({ searchParams }: Props) {
  const { page: pageStr, status: statusParam } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const statusFilter = statusParam ?? "ADMIN_REVIEW"

  const { requests, total, pageSize } = await getAdminReturnRequestList(page, statusFilter === "ALL" ? null : statusFilter)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { status?: string; page?: number }) {
    const params = new URLSearchParams()
    const s = overrides.status ?? statusFilter
    const p = overrides.page ?? page
    if (s && s !== "ADMIN_REVIEW") params.set("status", s)
    if (p > 1) params.set("page", String(p))
    return `/admin/returns${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Returns & Refunds</h1>

      <div className="flex gap-1 flex-wrap items-center">
        <Link
          href={buildHref({ status: "ALL", page: 1 })}
          className={`text-xs px-3 py-1 rounded border ${
            statusFilter === "ALL"
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border-default text-text-secondary hover:bg-brand-50"
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, page: 1 })}
            className={`text-xs px-3 py-1 rounded border ${
              statusFilter === s
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border-default text-text-secondary hover:bg-brand-50"
            }`}
          >
            {s.replaceAll("_", " ")}
          </Link>
        ))}
        <span className="ml-2 text-xs text-text-secondary">{total} requests</span>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No return/refund requests found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Order</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    #{r.orderId.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{r.buyer.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.shop.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">
                    {formatPrice(r.order.total)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{r.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(r.createdAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/returns/${r.id}`} className="text-xs text-brand-600 hover:underline">
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
