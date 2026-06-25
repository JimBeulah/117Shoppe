import { SectionHeader } from "@/components/ui/SectionHeader"
import { CountdownTimer } from "@/components/ui/CountdownTimer"
import { ProductCard } from "@/components/ui/ProductCard"
import type { ProductCard as ProductCardType } from "@/types"

export function FlashSaleSection({ products, endsAt }: { products: ProductCardType[]; endsAt: Date }) {
  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <h2 className="text-lg font-bold text-accent-hot uppercase tracking-wide">🔥 Flash Sale</h2>
          <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-accent-hot rounded" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">Ends in</span>
          <CountdownTimer endsAt={endsAt} />
          <a href="/flash-sale" className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
            View All →
          </a>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {products.map((p) => (
          <div key={p.id} className="min-w-[160px] max-w-[160px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  )
}
