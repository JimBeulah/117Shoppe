import Link from "next/link"
import { getAllStockOverview, getAdminStockMovements } from "@/lib/inventory/queries"
import type { StockMovementType } from "@/lib/generated/prisma/client"

export const metadata = { title: "Admin — Inventory" }

interface Props {
  searchParams: Promise<{ page?: string; type?: string; search?: string }>
}

export default async function AdminInventoryPage({ searchParams }: Props) {
  const { page: pageStr, type: typeParam, search } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const type = (typeParam as StockMovementType | undefined) ?? null

  const [products, { movements, total, pageSize, movementTypes }] = await Promise.all([
    getAllStockOverview(search ?? null),
    getAdminStockMovements(page, { type }),
  ])
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { type?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const t = "type" in overrides ? overrides.type : type
    const p = overrides.page ?? page
    if (t) params.set("type", t)
    if (p > 1) params.set("page", String(p))
    if (search) params.set("search", search)
    return `/admin/inventory${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Inventory</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <h2 className="font-semibold text-sm text-text-primary">Products</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Stock</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Last Movement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/inventory/${p.id}`} className="text-brand-600 hover:underline font-medium">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{p.shop.name}</td>
                <td className="px-4 py-3 text-right text-text-primary">
                  {p.variants.length > 0 ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {p.lastMovementAt ? new Date(p.lastMovementAt).toLocaleDateString("en-PH") : "—"}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-semibold text-sm text-text-primary mb-2">Stock Movement Ledger</h2>
        <div className="flex gap-1 border-b border-border-default overflow-x-auto">
          <Link
            href={buildHref({ type: null, page: 1 })}
            className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
              type === null ? "border-brand-600 text-brand-600 font-medium" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            All
          </Link>
          {movementTypes.map((t) => (
            <Link
              key={t}
              href={buildHref({ type: t, page: 1 })}
              className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
                type === t ? "border-brand-600 text-brand-600 font-medium" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.replaceAll("_", " ")}
            </Link>
          ))}
        </div>

        {movements.length === 0 ? (
          <div className="bg-white rounded-lg border border-border-default p-12 text-center">
            <p className="text-text-secondary text-sm">No stock movements found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-border-default border-t-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border-default bg-bg-page">
                <tr>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Timestamp</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Type</th>
                  <th className="text-right px-4 py-3 text-text-secondary font-medium">Delta</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Actor</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString("en-PH")}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/inventory/${m.productId}`} className="text-brand-600 hover:underline">
                        {m.product.name}
                      </Link>
                      {m.variant && <span className="block text-xs text-text-secondary">{m.variant.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{m.type.replaceAll("_", " ")}</td>
                    <td className={`px-4 py-3 text-right font-mono ${m.delta < 0 ? "text-red-600" : "text-green-700"}`}>
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{m.actor?.name ?? "System"}</td>
                    <td className="px-4 py-3 text-text-secondary">{m.reason ?? "—"}</td>
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
                    <Link href={buildHref({ page: page - 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={buildHref({ page: page + 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
