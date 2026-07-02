import { SectionHeader } from "@/components/ui/SectionHeader"
import { ProductCard } from "@/components/ui/ProductCard"
import type { ProductCard as ProductCardType } from "@/types"

export function DailyDiscoverPanel({ products }: { products: ProductCardType[] }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-border/50 shadow-sm">
      <SectionHeader title="Daily Discover" href="/discover" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
