"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { removeFromWishlist, moveToCart } from "@/app/(shop)/account/wishlist/actions"
import { useWishlist } from "@/components/wishlist/WishlistProvider"
import type { WishlistItem } from "@/types"

export function WishlistRow({ item }: { item: WishlistItem }) {
  const { product } = item
  const { removeLocal } = useWishlist()
  const [message, setMessage] = useState("")
  const [isRemoved, setIsRemoved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const imageUrl = product.images[0] ?? "https://placehold.co/200x200/EDE9FE/7C3AED?text=No+Image"
  const isUnavailable =
    product.stock <= 0 || !product.isActive || product.status !== "ACTIVE" || product.shop.isOnVacation

  const unavailableLabel = product.shop.isOnVacation
    ? "Shop on vacation"
    : product.stock <= 0
    ? "Out of stock"
    : "No longer available"

  function handleRemove() {
    startTransition(async () => {
      const result = await removeFromWishlist(product.id)
      if (result.error) {
        setMessage(result.error)
      } else {
        removeLocal(product.id)
        setIsRemoved(true)
      }
    })
  }

  function handleMoveToCart() {
    startTransition(async () => {
      const result = await moveToCart(product.id)
      if (result.error) {
        setMessage(result.error)
        setTimeout(() => setMessage(""), 3000)
      } else {
        removeLocal(product.id)
        setIsRemoved(true)
      }
    })
  }

  if (isRemoved) return null

  return (
    <div
      className={`flex items-center gap-4 bg-white border border-border-default rounded-lg p-4 ${
        isUnavailable ? "opacity-60" : ""
      }`}
    >
      <Link href={`/product/${product.slug}`} className="flex-shrink-0">
        <div className="relative w-20 h-20 rounded overflow-hidden bg-brand-50">
          <Image src={imageUrl} alt={product.name} fill sizes="80px" className="object-cover" />
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/product/${product.slug}`} className="text-sm font-medium text-text-primary line-clamp-2 hover:text-brand-600">
          {product.name}
        </Link>
        <p className="text-xs text-text-secondary mt-0.5">{product.shop.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-bold text-accent-sale">{formatPrice(product.price)}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-text-secondary line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
        {isUnavailable && <p className="text-xs text-accent-sale font-medium mt-1">{unavailableLabel}</p>}
        {message && (
          <p className="text-xs text-text-secondary mt-1" role="status">
            {message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-shrink-0">
        {product.hasVariants ? (
          <Link
            href={`/product/${product.slug}`}
            className="px-4 py-1.5 rounded text-sm font-medium border border-brand-600 text-brand-600 hover:bg-brand-50 transition-colors text-center"
          >
            Choose options
          </Link>
        ) : (
          <button
            onClick={handleMoveToCart}
            disabled={isPending || isUnavailable}
            className="px-4 py-1.5 rounded text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Move to cart"}
          </button>
        )}
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="px-4 py-1.5 rounded text-sm font-medium border border-border text-text-secondary hover:border-brand-400 transition-colors disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
