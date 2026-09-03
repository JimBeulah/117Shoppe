import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Coins } from "lucide-react"
import { getCurrentUser } from "@/lib/data/user"
import { getCoinBalance, getCoinLedger } from "@/lib/data/coins"
import { coinsToPeso } from "@/lib/coins"
import { formatPrice } from "@/lib/utils"
import { Pagination } from "@/components/catalog/Pagination"

export const metadata = { title: "Shoppe Coins | 11/7 Shoppe" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

const LEDGER_LABELS: Record<string, string> = {
  EARNED: "Earned",
  SPENT: "Spent",
  EXPIRED: "Expired",
  REFUNDED: "Returned",
}

export default async function CoinsPage({ searchParams }: Props) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1) || 1)

  const [{ balance, expiringSoon }, { items, total, pageSize }] = await Promise.all([
    getCoinBalance(user.id),
    getCoinLedger(user.id, page),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Shoppe Coins</h1>

      <div className="bg-white rounded-lg border border-border p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
          <Coins className="w-6 h-6" />
        </div>
        <div>
          <p className="text-3xl font-bold text-text-primary">{balance.toLocaleString()}</p>
          <p className="text-sm text-text-secondary">
            Worth {formatPrice(coinsToPeso(balance))} at checkout
            {expiringSoon > 0 && ` · ${expiringSoon.toLocaleString()} expiring within 30 days`}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-text-secondary py-12">
          <p className="text-lg font-medium">No coin activity yet.</p>
          <p className="text-sm mt-1">Earn coins by completing orders, then use them at checkout.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border divide-y divide-border">
          {items.map((entry) => {
            const isCredit = entry.type === "EARNED" || entry.type === "REFUNDED"
            return (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {LEDGER_LABELS[entry.type] ?? entry.type}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {entry.description ?? "—"} · {entry.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${isCredit ? "text-green-600" : "text-text-secondary"}`}>
                  {isCredit ? "+" : "-"}
                  {entry.amount.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <Pagination total={total} pageSize={pageSize} currentPage={page} />
    </div>
  )
}
