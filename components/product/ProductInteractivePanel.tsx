"use client"

import { useState } from "react"
import { VariantPicker } from "@/components/product/VariantPicker"
import { AddToCartButton } from "@/components/product/AddToCartButton"
import { WishlistHeart } from "@/components/wishlist/WishlistHeart"
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
  isShopOnVacation?: boolean
  vacationMessage?: string | null
}

export function ProductInteractivePanel({
  productId,
  basePrice,
  originalPrice,
  flashSalePrice,
  isFlashSale,
  baseStock,
  variants,
  isShopOnVacation = false,
  vacationMessage = null,
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
      <div className="bg-bg-page rounded-md px-4 py-3 flex items-baseline gap-2 flex-wrap">
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
        {isShopOnVacation ? (
          <span className="text-amber-700 font-medium">
            Seller is on vacation{vacationMessage ? ` — ${vacationMessage}` : ""}
          </span>
        ) : stock > 0 ? (
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
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <AddToCartButton
            productId={productId}
            variantId={selectedId}
            stock={isShopOnVacation ? 0 : stock}
            outOfStockLabel={isShopOnVacation ? "Seller on Vacation" : "Out of Stock"}
          />
        </div>
        <WishlistHeart productId={productId} variant="pdp" />
      </div>
    </div>
  )
}
