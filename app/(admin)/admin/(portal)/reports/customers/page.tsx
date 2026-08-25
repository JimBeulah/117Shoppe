import { getCustomerReport } from "@/lib/admin/reports"
import { formatPrice } from "@/lib/utils"
import { StatCard } from "@/components/reports/StatCard"
import { DateRangeForm } from "@/components/reports/DateRangeForm"
import { ReportTable } from "@/components/reports/ReportTable"
import { resolveDateRange, toDateInputValue } from "@/lib/reports/dates"

export const metadata = { title: "Admin — Customer Reports" }

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function AdminCustomerReportsPage({ searchParams }: Props) {
  const { from: fromStr, to: toStr } = await searchParams
  const { from, to } = resolveDateRange(fromStr, toStr)

  const report = await getCustomerReport(from, to)
  const exportQuery = `from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Customer Reports</h1>
        <DateRangeForm from={from} to={to} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="New Customers" value={String(report.newCustomers)} />
        <StatCard label="Returning Customers" value={String(report.returningCustomers)} />
        <StatCard label="Total Customers" value={String(report.totalCustomers)} />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="font-semibold text-sm text-text-primary">Top Customers by Spend</h2>
          <a
            href={`/api/admin/reports/export?type=customers&${exportQuery}`}
            className="text-xs px-3 py-1.5 rounded border border-border-default text-text-secondary hover:bg-brand-50 hover:text-text-primary"
          >
            Download CSV
          </a>
        </div>
        <ReportTable
          rowKey={(c) => c.id}
          emptyMessage="No customers in this range."
          rows={report.topCustomers}
          columns={[
            {
              key: "customer",
              label: "Customer",
              render: (c) => (
                <div>
                  <p className="font-medium text-text-primary">{c.name}</p>
                  <p className="text-xs text-text-secondary">{c.email}</p>
                </div>
              ),
            },
            { key: "orders", label: "Orders", align: "right", render: (c) => c.orders },
            { key: "totalSpent", label: "Total Spent", align: "right", render: (c) => formatPrice(c.totalSpent) },
          ]}
        />
      </div>
    </div>
  )
}
