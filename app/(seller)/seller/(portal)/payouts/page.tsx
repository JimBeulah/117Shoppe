import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getSellerBalance, getSellerPayouts } from "@/lib/seller/queries"
import { requestPayout } from "@/lib/seller/actions"
import { MIN_PAYOUT_AMOUNT } from "@/lib/payouts/config"
import SellerStatCard from "@/components/seller/SellerStatCard"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Seller — Payouts" }

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function SellerPayoutsPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const [balance, { payouts, total, pageSize }] = await Promise.all([
    getSellerBalance(shop.id),
    getSellerPayouts(shop.id, page),
  ])
  const totalPages = Math.ceil(total / pageSize)
  const canRequest = balance.available >= MIN_PAYOUT_AMOUNT && !balance.hasOpenPayout

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Payouts</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SellerStatCard label="In Buffer" value={formatPrice(balance.pending)} sub="Awaiting return window" />
        <SellerStatCard label="Available" value={formatPrice(balance.available)} highlight={balance.available > 0} />
        <SellerStatCard label="Lifetime Paid" value={formatPrice(balance.lifetimePaid)} />
        <div className="bg-white rounded-lg border border-border-default p-4 flex flex-col justify-between">
          <form>
            <button
              type="submit"
              disabled={!canRequest}
              formAction={async () => {
                "use server"
                await requestPayout()
              }}
              className="w-full text-sm px-3 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Request Payout
            </button>
          </form>
          <p className="text-xs text-text-secondary mt-2">
            {balance.hasOpenPayout
              ? "You have a payout in progress."
              : `Minimum ₱${MIN_PAYOUT_AMOUNT} available required.`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <h2 className="font-semibold text-sm text-text-primary">Payout History</h2>
        </div>
        {payouts.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">No payouts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Requested</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="px-4 py-3 font-medium text-text-primary">{formatPrice(payout.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[payout.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(payout.requestedAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">
                    {payout.referenceNote ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
            <p className="text-xs text-text-secondary">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/seller/payouts?page=${page - 1}`}
                  className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                >
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/seller/payouts?page=${page + 1}`}
                  className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
