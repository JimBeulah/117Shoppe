import Link from "next/link"
import { getAdminProducts } from "@/lib/admin/queries"
import { adminToggleProduct } from "@/lib/admin/actions"
import { approveProduct, rejectProduct } from "@/lib/admin/products"
import { formatPrice } from "@/lib/utils"
import { SearchInput } from "@/components/ui/SearchInput"

export const metadata = { title: "Admin — Products" }

const STATUS_TABS = [
  { label: "All", value: null },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
]

interface Props {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const { page: pageStr, search, status: statusParam } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const searchQuery = search ?? null
  const statusFilter = statusParam ?? null

  const { products, total, pageSize } = await getAdminProducts(page, searchQuery, statusFilter)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { status?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const s = "status" in overrides ? overrides.status : statusFilter
    const p = overrides.page ?? page
    const q = searchQuery
    if (s) params.set("status", s)
    if (q) params.set("search", q)
    if (p > 1) params.set("page", String(p))
    return `/admin/products${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Products</h1>
        <SearchInput placeholder="Search products by name, shop or category..." />
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

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Category</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Price</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Stock</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
              <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">{product.name}</td>
                <td className="px-4 py-3 text-text-secondary">{product.shop.name}</td>
                <td className="px-4 py-3 text-text-secondary">{product.category.name}</td>
                <td className="px-4 py-3 text-right text-text-primary">{formatPrice(product.price)}</td>
                <td className="px-4 py-3 text-right text-text-primary">{product.stock}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.status === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : product.status === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {product.status}
                  </span>
                  {product.rejectionReason && (
                    <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">{product.rejectionReason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <form>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="isActive" value={String(!product.isActive)} />
                    <button
                      type="submit"
                      formAction={async (fd: FormData) => {
                        "use server"
                        await adminToggleProduct(fd.get("productId") as string, fd.get("isActive") === "true")
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${product.isActive ? "bg-brand-600" : "bg-gray-200"}`}
                      title={product.isActive ? "Deactivate" : "Activate"}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${product.isActive ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-text-secondary">{new Date(product.createdAt).toLocaleDateString("en-PH")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {product.status !== "APPROVED" && (
                      <form>
                        <input type="hidden" name="productId" value={product.id} />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await approveProduct(fd.get("productId") as string)
                          }}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                        >
                          Approve
                        </button>
                      </form>
                    )}
                    {product.status !== "REJECTED" && (
                      <form className="flex items-center gap-1">
                        <input type="hidden" name="productId" value={product.id} />
                        <input
                          name="reason"
                          placeholder="Reason"
                          className="text-xs border border-border-default rounded px-2 py-1 w-28"
                        />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await rejectProduct(fd.get("productId") as string, fd.get("reason") as string)
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
            <p className="text-xs text-text-secondary">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={buildHref({ page: page - 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Previous</Link>}
              {page < totalPages && <Link href={buildHref({ page: page + 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
