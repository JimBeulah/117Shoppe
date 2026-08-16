import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getSellerProducts } from "@/lib/seller/queries"
import { getShopAccess, canAccess } from "@/lib/seller/access"
import { SearchInput } from "@/components/ui/SearchInput"
import ProductsBulkTable from "@/components/seller/ProductsBulkTable"

export const metadata = { title: "My Products" }

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { page: pageStr, search } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const searchQuery = search ?? null

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const access = await getShopAccess()
  if (!access) redirect("/seller/onboarding")
  if (!canAccess(access, "PRODUCTS")) redirect("/seller/dashboard")
  const shop = access.shop

  const { products, total, pageSize } = await getSellerProducts(shop.id, page, searchQuery)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { page?: number }) {
    const params = new URLSearchParams()
    const p = overrides.page ?? page
    const q = searchQuery
    if (q) params.set("search", q)
    if (p > 1) params.set("page", String(p))
    return `/seller/products${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-text-primary">Products</h1>
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <SearchInput placeholder="Search your products..." />
          <Link
            href="/seller/products/new"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors shrink-0"
          >
            + Add Product
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No products found.</p>
          <Link
            href="/seller/products/new"
            className="mt-3 inline-block text-sm text-brand-600 hover:underline"
          >
            Add a new product →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <ProductsBulkTable products={products} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
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
