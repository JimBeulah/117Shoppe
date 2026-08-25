import { redirect } from "next/navigation"
import { requireShopAccess } from "@/lib/seller/access"
import { getSellerConversionReport } from "@/lib/seller/reports"
import { StatCard } from "@/components/reports/StatCard"
import { DateRangeForm } from "@/components/reports/DateRangeForm"
import { ReportTable } from "@/components/reports/ReportTable"
import { resolveDateRange, toDateInputValue } from "@/lib/reports/dates"

export const metadata = { title: "Seller — Conversion Reports" }

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

export default async function SellerConversionReportsPage({ searchParams }: Props) {
  const { from: fromStr, to: toStr } = await searchParams

  const shop = await requireShopAccess("REPORTS")
  if (!shop) redirect("/seller/dashboard")

  const { from, to } = resolveDateRange(fromStr, toStr)

  const report = await getSellerConversionReport(shop.id, from, to)
  const exportQuery = `from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Conversion Reports</h1>
        <DateRangeForm from={from} to={to} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Product Views" value={String(report.views)} />
        <StatCard label="Adds to Cart" value={String(report.addsToCart)} />
        <StatCard label="Purchases" value={String(report.purchases)} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="View → Cart Rate" value={formatRate(report.viewToCartRate)} />
        <StatCard label="Cart → Purchase Rate" value={formatRate(report.cartToPurchaseRate)} />
        <StatCard label="Overall Conversion" value={formatRate(report.overallConversionRate)} />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="font-semibold text-sm text-text-primary">Top Viewed Products</h2>
          <a
            href={`/api/seller/reports/export?type=conversion&${exportQuery}`}
            className="text-xs px-3 py-1.5 rounded border border-border-default text-text-secondary hover:bg-brand-50 hover:text-text-primary"
          >
            Download CSV
          </a>
        </div>
        <ReportTable
          rowKey={(p) => p.id}
          emptyMessage="No product views in this range."
          rows={report.topProducts}
          columns={[
            { key: "product", label: "Product", render: (p) => <span className="font-medium text-text-primary">{p.name}</span> },
            { key: "views", label: "Views", align: "right", render: (p) => p.views },
            { key: "adds", label: "Adds to Cart", align: "right", render: (p) => p.addsToCart },
            { key: "purchases", label: "Purchases", align: "right", render: (p) => p.purchases },
            { key: "rate", label: "Conversion Rate", align: "right", render: (p) => formatRate(p.conversionRate) },
          ]}
        />
      </div>
    </div>
  )
}
