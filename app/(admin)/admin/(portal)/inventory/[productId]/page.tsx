import { notFound } from "next/navigation"
import Link from "next/link"
import { getProductWithMovements } from "@/lib/inventory/queries"
import { adminAdjustStock } from "@/lib/inventory/actions"
import { StockMovementTimeline } from "@/components/inventory/StockMovementTimeline"

export const metadata = { title: "Admin — Product Inventory" }

interface Props {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function AdminProductInventoryPage({ params, searchParams }: Props) {
  const { productId } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const data = await getProductWithMovements(productId, page)
  if (!data) notFound()
  const { product, movements, total, pageSize } = data
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-xs text-brand-600 hover:underline">
          ← Back to Inventory
        </Link>
        <h1 className="text-xl font-bold text-text-primary mt-1">{product.name}</h1>
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-3">Current Stock</h2>
        {product.variants.length === 0 ? (
          <p className="text-sm text-text-primary">{product.stock} units</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-secondary">
                <th className="text-left font-medium pb-2">Variant</th>
                <th className="text-left font-medium pb-2">SKU</th>
                <th className="text-right font-medium pb-2">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {product.variants.map((v) => (
                <tr key={v.id}>
                  <td className="py-2 text-text-primary">{v.name}</td>
                  <td className="py-2 text-text-secondary font-mono text-xs">{v.sku ?? "—"}</td>
                  <td className="py-2 text-right text-text-primary">{v.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-4">Adjust Stock</h2>
        <form className="grid grid-cols-2 gap-3">
          <input type="hidden" name="productId" value={product.id} />
          {product.variants.length > 0 && (
            <div className="col-span-2">
              <label className="text-xs text-text-secondary block mb-1">Variant</label>
              <select name="variantId" className="w-full text-sm border border-border-default rounded px-3 py-2">
                <option value="">— Product (no variant) —</option>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-text-secondary block mb-1">Quantity (+/-) *</label>
            <input
              name="delta"
              type="number"
              required
              className="w-full text-sm border border-border-default rounded px-3 py-2"
              placeholder="e.g. 10 or -5"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Type *</label>
            <select name="type" className="w-full text-sm border border-border-default rounded px-3 py-2">
              <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
              <option value="RESTOCK_IN">Restock In</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-text-secondary block mb-1">Reason *</label>
            <input
              name="reason"
              required
              className="w-full text-sm border border-border-default rounded px-3 py-2"
              placeholder="e.g. Damaged, Recount, Platform correction"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                await adminAdjustStock(fd)
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
            >
              Apply Adjustment
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-4">Movement History</h2>
        <StockMovementTimeline movements={movements} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border-default">
            <p className="text-xs text-text-secondary">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/inventory/${product.id}?page=${page - 1}`}
                  className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/inventory/${product.id}?page=${page + 1}`}
                  className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
