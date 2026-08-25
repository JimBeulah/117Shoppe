import { getProductReport } from "@/lib/admin/reports"
import { formatPrice } from "@/lib/utils"
import { DateRangeForm } from "@/components/reports/DateRangeForm"
import { ReportTable } from "@/components/reports/ReportTable"
import { resolveDateRange, toDateInputValue } from "@/lib/reports/dates"

export const metadata = { title: "Admin — Product Reports" }

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function AdminProductReportsPage({ searchParams }: Props) {
  const { from: fromStr, to: toStr } = await searchParams
  const { from, to } = resolveDateRange(fromStr, toStr)

  const products = await getProductReport(from, to)
  const exportQuery = `from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Product Reports</h1>
        <DateRangeForm from={from} to={to} />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="font-semibold text-sm text-text-primary">Product Performance</h2>
          <a
            href={`/api/admin/reports/export?type=product-detail&${exportQuery}`}
            className="text-xs px-3 py-1.5 rounded border border-border-default text-text-secondary hover:bg-brand-50 hover:text-text-primary"
          >
            Download CSV
          </a>
        </div>
        <ReportTable
          rowKey={(p) => p.id}
          emptyMessage="No sales in this range."
          rows={products}
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
            { key: "stock", label: "Current Stock", align: "right", render: (p) => p.currentStock },
            { key: "restocked", label: "Restocked", align: "right", render: (p) => p.restockedUnits },
            { key: "cancelled", label: "Cancelled", align: "right", render: (p) => p.cancelledUnits },
          ]}
        />
      </div>
    </div>
  )
}
