import Link from "next/link"
import { getAdminShops } from "@/lib/admin/queries"
import { approveShop, rejectShop } from "@/lib/admin/actions"
import ShopStatusBadge from "@/components/admin/ShopStatusBadge"
import { SearchInput } from "@/components/ui/SearchInput"

export const metadata = { title: "Admin — Sellers" }

const STATUS_TABS = [
  { label: "All", value: null },
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Rejected", value: "REJECTED" },
]

interface Props {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export default async function AdminSellersPage({ searchParams }: Props) {
  const { page: pageStr, status: statusParam, search } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const statusFilter = statusParam ?? null
  const searchQuery = search ?? null

  const { shops, total, pageSize } = await getAdminShops(page, statusFilter, searchQuery)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { status?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const s = "status" in overrides ? overrides.status : statusFilter
    const p = overrides.page ?? page
    const q = searchQuery
    if (s) params.set("status", s)
    if (q) params.set("search", q)
    if (p > 1) params.set("page", String(p))
    return `/admin/sellers${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Sellers</h1>
        <SearchInput placeholder="Search shops by name or email..." />
      </div>

      <div className="flex gap-1 border-b border-border-default">
        {STATUS_TABS.map((tab) => {
          const href = buildHref({ status: tab.value, page: 1 })
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                active ? "border-brand-600 text-brand-600 font-medium" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {shops.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No shops found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Owner</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {shops.map((shop) => (
                <tr key={shop.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{shop.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{shop.owner.email}</td>
                  <td className="px-4 py-3">
                    <ShopStatusBadge status={shop.status} />
                    {shop.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">{shop.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(shop.createdAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {shop.status !== "ACTIVE" && (
                        <form>
                          <input type="hidden" name="shopId" value={shop.id} />
                          <button
                            type="submit"
                            formAction={async (fd: FormData) => {
                              "use server"
                              await approveShop(fd.get("shopId") as string)
                            }}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                          >
                            Approve
                          </button>
                        </form>
                      )}
                      {shop.status !== "REJECTED" && (
                        <form className="flex items-center gap-1">
                          <input type="hidden" name="shopId" value={shop.id} />
                          <input
                            name="reason"
                            placeholder="Reason"
                            className="text-xs border border-border-default rounded px-2 py-1 w-32"
                          />
                          <button
                            type="submit"
                            formAction={async (fd: FormData) => {
                              "use server"
                              await rejectShop(fd.get("shopId") as string, fd.get("reason") as string)
                            }}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                          >
                            Reject
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildHref({ page: page - 1 })}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildHref({ page: page + 1 })}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
