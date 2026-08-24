import { getSalesReport } from "@/lib/admin/reports"
import { formatPrice } from "@/lib/utils"
import DailyRevenueChart from "@/components/admin/DailyRevenueChart"

export const metadata = { title: "Admin — Reports" }

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function AdminReportsPage({ searchParams }: Props) {
  const { from: fromStr, to: toStr } = await searchParams

  const defaultTo = new Date()
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 29)

  const from = fromStr ? new Date(fromStr) : defaultFrom
  const to = toStr ? new Date(toStr) : defaultTo
  to.setHours(23, 59, 59, 999)

  const report = await getSalesReport(from, to)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Reports</h1>
        <form className="flex items-center gap-2">
          <input
            type="date"
            name="from"
            defaultValue={toDateInputValue(from)}
            className="text-sm border border-border-default rounded px-3 py-2"
          />
          <span className="text-text-secondary text-sm">to</span>
          <input
            type="date"
            name="to"
            defaultValue={toDateInputValue(defaultTo)}
            className="text-sm border border-border-default rounded px-3 py-2"
          />
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-border-default p-5">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Revenue</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{formatPrice(report.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-lg border border-border-default p-5">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Orders</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{report.totalOrders}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-4">Daily Revenue</h2>
        <DailyRevenueChart data={report.daily} />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <h2 className="font-semibold text-sm text-text-primary p-5 pb-0">Top Products</h2>
        {report.topProducts.length === 0 ? (
          <p className="text-sm text-text-secondary p-5">No sales in this range.</p>
        ) : (
          <table className="w-full text-sm mt-3">
            <thead className="border-y border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Units Sold</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {report.topProducts.map((p) => (
                <tr key={p.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-8 h-8 object-cover rounded border border-border-default" />
                      ) : (
                        <div className="w-8 h-8 bg-brand-50 rounded border border-border-default" />
                      )}
                      <span className="font-medium text-text-primary truncate max-w-[240px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">{p.sold}</td>
                  <td className="px-4 py-3 text-right text-text-primary">{formatPrice(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
