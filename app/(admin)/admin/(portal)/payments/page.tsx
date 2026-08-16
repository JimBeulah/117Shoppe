import Link from "next/link"
import { getAdminPayments } from "@/lib/admin/payments"
import { issueRefund } from "@/lib/admin/refunds"
import { formatPrice } from "@/lib/utils"
import { SearchInput } from "@/components/ui/SearchInput"

export const metadata = { title: "Admin — Payments" }

const STATUS_TABS = [
  { label: "All", value: null },
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" },
  { label: "Failed", value: "FAILED" },
  { label: "Refunded", value: "REFUNDED" },
]

interface Props {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export default async function AdminPaymentsPage({ searchParams }: Props) {
  const { page: pageStr, status: statusParam, search } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const statusFilter = statusParam ?? null
  const searchQuery = search ?? null

  const { payments, total, pageSize } = await getAdminPayments(page, statusFilter, searchQuery)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { status?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const s = "status" in overrides ? overrides.status : statusFilter
    const p = overrides.page ?? page
    const q = searchQuery
    if (s) params.set("status", s)
    if (q) params.set("search", q)
    if (p > 1) params.set("page", String(p))
    return `/admin/payments${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Payments</h1>
        <SearchInput placeholder="Search by order ID, reference or buyer..." />
      </div>

      <div className="flex gap-1 border-b border-border-default">
        {STATUS_TABS.map((tab) => {
          const href = buildHref({ status: tab.value, page: 1 })
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                active ? "border-brand-600 text-brand-600 font-medium" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No payments found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Order</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Method</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Provider</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Paid</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {payments.map((payment) => {
                const canRefund =
                  payment.order.status === "PAID" &&
                  payment.provider === "PAYMONGO" &&
                  payment.status === "PAID" &&
                  !payment.order.refund
                return (
                  <tr key={payment.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${payment.orderId}`} className="text-brand-600 hover:underline font-mono text-xs">
                        {payment.orderId.slice(0, 10)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{payment.order.user.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{payment.method}</td>
                    <td className="px-4 py-3 text-text-secondary">{payment.provider}</td>
                    <td className="px-4 py-3 text-right text-text-primary">{formatPrice(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === "PAID"
                            ? "bg-green-100 text-green-700"
                            : payment.status === "REFUNDED"
                            ? "bg-purple-100 text-purple-700"
                            : payment.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-PH") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canRefund && (
                        <form className="flex items-center gap-1 justify-end">
                          <input type="hidden" name="orderId" value={payment.orderId} />
                          <input
                            name="reason"
                            placeholder="Reason"
                            required
                            className="text-xs border border-border-default rounded px-2 py-1 w-28"
                          />
                          <button
                            type="submit"
                            formAction={async (fd: FormData) => {
                              "use server"
                              await issueRefund(fd.get("orderId") as string, fd.get("reason") as string)
                            }}
                            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
                          >
                            Refund
                          </button>
                        </form>
                      )}
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
                  <Link href={buildHref({ page: page - 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildHref({ page: page + 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">
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
