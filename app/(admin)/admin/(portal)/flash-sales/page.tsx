import Link from "next/link"
import { getAdminFlashSales } from "@/lib/admin/queries"
import { deleteFlashSale } from "@/lib/admin/actions"

export const metadata = { title: "Admin — Flash Sales" }

export default async function AdminFlashSalesPage() {
  const flashSales = await getAdminFlashSales()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Flash Sales</h1>
        <Link href="/admin/flash-sales/new" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded">
          + New Flash Sale
        </Link>
      </div>

      {flashSales.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No flash sales yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Start</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">End</th>
                <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Items</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {flashSales.map((fs) => (
                <tr key={fs.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{fs.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(fs.startsAt).toLocaleString("en-PH")}</td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(fs.endsAt).toLocaleString("en-PH")}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fs.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {fs.isActive ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">{fs._count.items}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/flash-sales/${fs.id}`} className="text-xs text-brand-600 hover:underline">Edit</Link>
                      <form>
                        <input type="hidden" name="fsId" value={fs.id} />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await deleteFlashSale(fd.get("fsId") as string)
                          }}
                          className="text-xs text-red-500 hover:underline"
                          onClick={(e) => { if (!confirm("Delete this flash sale and all its items?")) e.preventDefault() }}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
