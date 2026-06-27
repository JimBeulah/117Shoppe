import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getSellerProducts } from "@/lib/seller/queries"
import { toggleProduct, deleteProduct } from "@/lib/seller/actions"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "My Products" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const { products, total, pageSize } = await getSellerProducts(shop.id, page)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Products</h1>
        <Link
          href="/seller/products/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No products yet.</p>
          <Link
            href="/seller/products/new"
            className="mt-3 inline-block text-sm text-brand-600 hover:underline"
          >
            Add your first product →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Price</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Sold</th>
                <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded border border-border-default flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-brand-50 rounded border border-border-default flex-shrink-0" />
                      )}
                      <span className="font-medium text-text-primary truncate max-w-[200px]">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">{product.stock}</td>
                  <td className="px-4 py-3 text-right text-text-secondary">{product.sold}</td>
                  <td className="px-4 py-3 text-center">
                    <form>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="isActive" value={String(!product.isActive)} />
                      <button
                        type="submit"
                        formAction={async (formData: FormData) => {
                          "use server"
                          const id = formData.get("productId") as string
                          const active = formData.get("isActive") === "true"
                          await toggleProduct(id, active)
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          product.isActive ? "bg-brand-600" : "bg-gray-200"
                        }`}
                        title={product.isActive ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            product.isActive ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/seller/products/${product.id}/edit`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <form>
                        <input type="hidden" name="productId" value={product.id} />
                        <button
                          type="submit"
                          formAction={async (formData: FormData) => {
                            "use server"
                            const id = formData.get("productId") as string
                            await deleteProduct(id)
                          }}
                          className="text-xs text-red-500 hover:underline"
                          onClick={(e) => {
                            if (!confirm("Deactivate this product?")) e.preventDefault()
                          }}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/seller/products?page=${page - 1}`}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/seller/products?page=${page + 1}`}
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
