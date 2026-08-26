import dynamic from "next/dynamic"
import { getSalesReport } from "@/lib/admin/reports"
import { formatPrice } from "@/lib/utils"
import { StatCard } from "@/components/reports/StatCard"
import { DateRangeForm } from "@/components/reports/DateRangeForm"
import { ReportTable } from "@/components/reports/ReportTable"
import { resolveDateRange } from "@/lib/reports/dates"

const RevenueChart = dynamic(() =>
  import("@/components/reports/RevenueChart").then((m) => m.RevenueChart)
)

export const metadata = { title: "Admin — Reports" }

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function AdminReportsPage({ searchParams }: Props) {
  const { from: fromStr, to: toStr } = await searchParams
  const { from, to } = resolveDateRange(fromStr, toStr)

  const report = await getSalesReport(from, to)

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
        <h2 className="font-semibold text-sm text-text-primary mb-4">Daily Revenue</h2>
        <RevenueChart data={report.daily} />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <h2 className="font-semibold text-sm text-text-primary p-5 pb-0">Top Products</h2>
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
