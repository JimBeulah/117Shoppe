import Image from "next/image"
import Link from "next/link"
import { formatPrice, formatSold, calcDiscount } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import type { ProductCard as ProductCardType } from "@/types"

export function ProductCard({ product }: { product: ProductCardType }) {
  const displayPrice = product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price
  const originalPrice = product.originalPrice ?? product.price
  const discount = calcDiscount(originalPrice, displayPrice)
  const imageUrl = product.images[0] ?? "https://placehold.co/400x400/EDE9FE/7C3AED?text=No+Image"

  return (
    <Link href={`/product/${product.slug}`} className="group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-brand-100">
      <div className="relative aspect-square overflow-hidden bg-brand-50">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount >= 5 && (
          <div className="absolute top-2 left-2">
            <Badge variant="sale" label={`-${discount}%`} />
          </div>
        )}
        {product.isFlashSale && (
          <div className="absolute top-2 right-2">
            <Badge variant="hot" label="Flash" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-text-primary font-medium line-clamp-2 leading-snug min-h-[32px]">{product.name}</p>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-accent-sale">{formatPrice(displayPrice)}</span>
          {discount >= 5 && (
            <span className="text-[10px] text-text-secondary line-through">{formatPrice(originalPrice)}</span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <span className="text-reward text-xs">★</span>
            <span className="text-[10px] text-text-secondary">{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-[10px] text-text-secondary">{formatSold(product.sold)}</span>
        </div>
      </div>
    </Link>
  )
}
