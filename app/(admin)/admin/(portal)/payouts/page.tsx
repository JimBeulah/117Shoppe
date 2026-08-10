import Link from "next/link"
import { getAdminPayouts } from "@/lib/admin/queries"
import { markPayoutPaid, rejectPayoutRequest } from "@/lib/admin/payouts"

export const metadata = { title: "Admin — Payouts" }

const STATUS_TABS = [
  { label: "All", value: null },
  { label: "Requested", value: "REQUESTED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Paid", value: "PAID" },
  { label: "Rejected", value: "REJECTED" },
]

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>
}

export default async function AdminPayoutsPage({ searchParams }: Props) {
  const { page: pageStr, status: statusParam } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const statusFilter = statusParam ?? null

  const { payouts, total, pageSize } = await getAdminPayouts(page, statusFilter)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { status?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const s = "status" in overrides ? overrides.status : statusFilter
    const p = overrides.page ?? page
    if (s) params.set("status", s)
    if (p > 1) params.set("page", String(p))
    return `/admin/payouts${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Payouts</h1>

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

      {payouts.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No payout requests found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Requested</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Note</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{payout.shop.name}</td>
                  <td className="px-4 py-3 text-text-primary">₱{payout.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[payout.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(payout.requestedAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">
                    {payout.referenceNote ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {(payout.status === "REQUESTED" || payout.status === "PROCESSING") && (
                      <div className="flex items-center justify-end gap-2">
                        <form>
                          <input type="hidden" name="payoutId" value={payout.id} />
                          <input
                            name="referenceNote"
                            placeholder="Reference #"
                            className="text-xs border border-border-default rounded px-2 py-1 w-28 mr-1"
                          />
                          <button
                            type="submit"
                            formAction={async (fd: FormData) => {
                              "use server"
                              await markPayoutPaid(
                                fd.get("payoutId") as string,
                                fd.get("referenceNote") as string
                              )
                            }}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        </form>
                        <form className="flex items-center gap-1">
                          <input type="hidden" name="payoutId" value={payout.id} />
                          <input
                            name="reason"
                            placeholder="Reason"
                            className="text-xs border border-border-default rounded px-2 py-1 w-28"
                          />
                          <button
                            type="submit"
                            formAction={async (fd: FormData) => {
                              "use server"
                              await rejectPayoutRequest(fd.get("payoutId") as string, fd.get("reason") as string)
                            }}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    )}
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
