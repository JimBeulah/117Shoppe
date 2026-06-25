import { ProductCard } from "@/components/ui/ProductCard"
import type { ProductCard as ProductCardType } from "@/types"

export function ProductGrid({ products }: { products: ProductCardType[] }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
        <span className="text-4xl mb-3" aria-hidden="true">🛍️</span>
        <p className="text-sm">No products found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
