import Link from "next/link"
import { getAdminProducts } from "@/lib/admin/queries"
import { adminToggleProduct } from "@/lib/admin/actions"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Admin — Products" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const { products, total, pageSize } = await getAdminProducts(page)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Products</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Category</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Price</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Stock</th>
              <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Created</th>
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
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${product.isActive ? "bg-brand-600" : "bg-gray-200"}`}
                      title={product.isActive ? "Deactivate" : "Activate"}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${product.isActive ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-text-secondary">{new Date(product.createdAt).toLocaleDateString("en-PH")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
            <p className="text-xs text-text-secondary">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/admin/products?page=${page - 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Previous</Link>}
              {page < totalPages && <Link href={`/admin/products?page=${page + 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
