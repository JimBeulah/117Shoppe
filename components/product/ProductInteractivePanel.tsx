"use client"

import { useState } from "react"
import { VariantPicker } from "@/components/product/VariantPicker"
import { AddToCartButton } from "@/components/product/AddToCartButton"
import { Badge } from "@/components/ui/Badge"
import { formatPrice, calcDiscount } from "@/lib/utils"
import type { ProductVariantItem } from "@/types"

interface ProductInteractivePanelProps {
  productId: string
  basePrice: number
  originalPrice: number | null
  flashSalePrice: number | null
  isFlashSale: boolean
  baseStock: number
  variants: ProductVariantItem[]
}

export function ProductInteractivePanel({
  productId,
  basePrice,
  originalPrice,
  flashSalePrice,
  isFlashSale,
  baseStock,
  variants,
}: ProductInteractivePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? null

  const displayPrice = selectedVariant
    ? selectedVariant.price
    : isFlashSale && flashSalePrice !== null
    ? flashSalePrice
    : basePrice

  const comparePrice = selectedVariant ? null : (originalPrice ?? null)
  const discount = comparePrice ? calcDiscount(comparePrice, displayPrice) : 0
  const stock = selectedVariant ? selectedVariant.stock : baseStock

  return (
    <div className="space-y-4">
      {/* Price */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-accent-sale">{formatPrice(displayPrice)}</span>
        {comparePrice && discount >= 5 && (
          <>
            <span className="text-sm text-text-secondary line-through">{formatPrice(comparePrice)}</span>
            <Badge variant="sale" label={`-${discount}%`} />
          </>
        )}
        {isFlashSale && !selectedVariant && <Badge variant="hot" label="Flash Sale" />}
      </div>

      {/* Stock */}
      <p className="text-xs text-text-secondary">
        {stock > 0 ? (
          <>{stock.toLocaleString()} pieces available</>
        ) : (
          <span className="text-accent-sale font-medium">Out of Stock</span>
        )}
      </p>

      {/* Variants */}
      {variants.length > 0 && (
        <VariantPicker
          variants={variants}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}

      {/* Cart */}
      <AddToCartButton
        productId={productId}
        variantId={selectedId}
        stock={stock}
      />
    </div>
  )
}
