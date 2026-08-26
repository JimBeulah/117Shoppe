import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getShopAccess, canAccess } from "@/lib/seller/access"
import dynamic from "next/dynamic"
import { getSellerSalesReport } from "@/lib/seller/reports"
import { formatPrice } from "@/lib/utils"
import { StatCard } from "@/components/reports/StatCard"
import { DateRangeForm } from "@/components/reports/DateRangeForm"
import { ReportTable } from "@/components/reports/ReportTable"
import { resolveDateRange, toDateInputValue } from "@/lib/reports/dates"

const RevenueChart = dynamic(() =>
  import("@/components/reports/RevenueChart").then((m) => m.RevenueChart)
)

export const metadata = { title: "Seller — Reports" }

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function SellerReportsPage({ searchParams }: Props) {
  const { from: fromStr, to: toStr } = await searchParams

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const access = await getShopAccess()
  if (!access) redirect("/seller/onboarding")
  if (!canAccess(access, "REPORTS")) redirect("/seller/dashboard")
  const shop = access.shop

  const { from, to } = resolveDateRange(fromStr, toStr)

  const report = await getSellerSalesReport(shop.id, from, to)

  const exportQuery = `from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Reports</h1>
        <DateRangeForm from={from} to={to} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Revenue" value={formatPrice(report.totalRevenue)} />
        <StatCard label="Orders" value={String(report.totalOrders)} />
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm text-text-primary">Daily Revenue</h2>
          <a
            href={`/api/seller/reports/export?type=daily&${exportQuery}`}
            className="text-xs px-3 py-1.5 rounded border border-border-default text-text-secondary hover:bg-brand-50 hover:text-text-primary"
          >
            Download CSV
          </a>
        </div>
        <RevenueChart data={report.daily} />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="font-semibold text-sm text-text-primary">Top Products</h2>
          <a
            href={`/api/seller/reports/export?type=products&${exportQuery}`}
            className="text-xs px-3 py-1.5 rounded border border-border-default text-text-secondary hover:bg-brand-50 hover:text-text-primary"
          >
            Download CSV
          </a>
        </div>
        <ReportTable
          rowKey={(p) => p.id}
          emptyMessage="No sales in this range."
          rows={report.topProducts}
          columns={[
            {
              key: "product",
              label: "Product",
              render: (p) => (
                <div className="flex items-center gap-3">
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-8 h-8 object-cover rounded border border-border-default"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-brand-50 rounded border border-border-default" />
                  )}
                  <span className="font-medium text-text-primary truncate max-w-[240px]">{p.name}</span>
                </div>
              ),
            },
            { key: "sold", label: "Units Sold", align: "right", render: (p) => p.sold },
            { key: "revenue", label: "Revenue", align: "right", render: (p) => formatPrice(p.revenue) },
          ]}
        />
      </div>
    </div>
  )
}
