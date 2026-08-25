import { getStoreComparisonReport } from "@/lib/admin/reports"
import { formatPrice } from "@/lib/utils"
import { DateRangeForm } from "@/components/reports/DateRangeForm"
import { ReportTable } from "@/components/reports/ReportTable"
import { resolveDateRange, toDateInputValue } from "@/lib/reports/dates"

export const metadata = { title: "Admin — Store Reports" }

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function AdminStoreReportsPage({ searchParams }: Props) {
  const { from: fromStr, to: toStr } = await searchParams
  const { from, to } = resolveDateRange(fromStr, toStr)

  const stores = await getStoreComparisonReport(from, to)
  const exportQuery = `from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Store Reports</h1>
        <DateRangeForm from={from} to={to} />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="font-semibold text-sm text-text-primary">Stores by Revenue</h2>
          <a
            href={`/api/admin/reports/export?type=stores&${exportQuery}`}
            className="text-xs px-3 py-1.5 rounded border border-border-default text-text-secondary hover:bg-brand-50 hover:text-text-primary"
          >
            Download CSV
          </a>
        </div>
        <ReportTable
          rowKey={(s) => s.id}
          emptyMessage="No sales in this range."
          rows={stores}
          columns={[
            { key: "shop", label: "Shop", render: (s) => <span className="font-medium text-text-primary">{s.name}</span> },
            { key: "rating", label: "Rating", align: "right", render: (s) => s.rating.toFixed(1) },
            { key: "orders", label: "Orders", align: "right", render: (s) => s.orders },
            { key: "revenue", label: "Revenue", align: "right", render: (s) => formatPrice(s.revenue) },
            { key: "commission", label: "Commission", align: "right", render: (s) => formatPrice(s.commission) },
            { key: "netPayable", label: "Net Payable", align: "right", render: (s) => formatPrice(s.netPayable) },
          ]}
        />
      </div>
    </div>
  )
}
