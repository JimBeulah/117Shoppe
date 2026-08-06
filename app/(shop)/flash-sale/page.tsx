import type { Metadata } from "next"
import { getAllActiveFlashSaleProducts } from "@/lib/data/flashSale"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { Pagination } from "@/components/catalog/Pagination"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Flash Sale | 11/7 Shoppe",
  description: "Limited-time flash sale deals on 11/7 Shoppe — Philippines' favourite online shop",
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FlashSalePage({ searchParams }: Props) {
  const sp = await searchParams
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const result = await getAllActiveFlashSaleProducts(page)

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-accent-hot uppercase tracking-wide">🔥 Flash Sale</h1>
        <p className="text-sm text-text-secondary mb-3">
          {result.total.toLocaleString()} {result.total === 1 ? "deal" : "deals"} live right now
        </p>

        <ProductGrid products={result.products} />
        <Pagination total={result.total} pageSize={result.pageSize} currentPage={page} />
      </div>
    </div>
  )
}
