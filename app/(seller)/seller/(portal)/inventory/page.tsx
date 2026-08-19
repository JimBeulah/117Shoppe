import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getShopAccess, canAccess } from "@/lib/seller/access"
import { getShopStockOverview } from "@/lib/inventory/queries"
import { SearchInput } from "@/components/ui/SearchInput"

export const metadata = { title: "Inventory" }

interface Props {
  searchParams: Promise<{ search?: string }>
}

export default async function SellerInventoryPage({ searchParams }: Props) {
  const { search } = await searchParams

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const access = await getShopAccess()
  if (!access) redirect("/seller/onboarding")
  if (!canAccess(access, "INVENTORY")) redirect("/seller/dashboard")
  const shop = access.shop

  const products = await getShopStockOverview(shop.id, search ?? null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Inventory</h1>
        <SearchInput placeholder="Search products..." />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Variants</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Stock</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Last Movement</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                <td className="px-4 py-3 text-text-secondary">{p.variants.length || "—"}</td>
                <td className="px-4 py-3 text-right text-text-primary">
                  {p.variants.length > 0 ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {p.lastMovementAt ? new Date(p.lastMovementAt).toLocaleDateString("en-PH") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/seller/inventory/${p.id}`} className="text-xs text-brand-600 hover:underline">
                    View / Adjust
                  </Link>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
