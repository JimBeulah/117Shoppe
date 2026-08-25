import { redirect } from "next/navigation"
import { requireShopAccess } from "@/lib/seller/access"
import { getSellerStoreRank } from "@/lib/seller/reports"
import { formatPrice } from "@/lib/utils"
import { StatCard } from "@/components/reports/StatCard"
import { DateRangeForm } from "@/components/reports/DateRangeForm"
import { resolveDateRange } from "@/lib/reports/dates"

export const metadata = { title: "Seller — Store Reports" }

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function SellerStoreReportsPage({ searchParams }: Props) {
  const { from: fromStr, to: toStr } = await searchParams

  const shop = await requireShopAccess("REPORTS")
  if (!shop) redirect("/seller/dashboard")

  const { from, to } = resolveDateRange(fromStr, toStr)

  const { revenue, rank, totalShops } = await getSellerStoreRank(shop.id, from, to)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Store Reports</h1>
        <DateRangeForm from={from} to={to} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Your Revenue" value={formatPrice(revenue)} />
        <StatCard label="Rank" value={`#${rank} of ${totalShops}`} />
        <StatCard
          label="Percentile"
          value={totalShops > 0 ? `Top ${Math.max(1, Math.round((rank / totalShops) * 100))}%` : "—"}
        />
      </div>

      <p className="text-sm text-text-secondary">
        Your shop&apos;s revenue rank among all active shops for this date range. Other shops&apos; figures are not
        shown.
      </p>
    </div>
  )
}
