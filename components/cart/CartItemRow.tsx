"use client"

import { useOptimistic, useTransition } from "react"
import Image from "next/image"
import { Trash2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { updateCartItemQuantity, removeCartItem } from "@/app/(shop)/cart/actions"
import type { CartItemWithProduct } from "@/types"

interface CartItemRowProps {
  item: CartItemWithProduct
}

export function CartItemRow({ item }: CartItemRowProps) {
  const [optimisticQty, setOptimisticQty] = useOptimistic(item.quantity)
  const [isPending, startTransition] = useTransition()

  const unitPrice = item.variant?.price ?? item.product.price
  const maxStock = item.variant?.stock ?? item.product.stock

  function handleQtyChange(newQty: number) {
    startTransition(async () => {
      setOptimisticQty(newQty <= 0 ? 0 : newQty)
      await updateCartItemQuantity(item.id, newQty)
    })
  }

  function handleRemove() {
    startTransition(async () => {
      setOptimisticQty(0)
      await removeCartItem(item.id)
    })
  }

  if (optimisticQty === 0) return null

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-0">
      {/* Product image */}
      <div className="relative w-20 h-20 shrink-0 rounded overflow-hidden bg-bg-subtle">
        {item.product.images[0] ? (
          <Image
            src={item.product.images[0]}
            alt={item.product.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-brand-50" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary leading-snug line-clamp-2">
          {item.product.name}
        </p>
        {item.variant && (
          <p className="text-xs text-text-secondary mt-0.5">{item.variant.name}</p>
        )}
        <p className="text-sm font-bold text-accent-sale mt-1">{formatPrice(unitPrice)}</p>
      </div>

      {/* Qty + remove */}
      <div className="flex flex-col items-end justify-between shrink-0">
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="text-text-secondary hover:text-accent-sale transition-colors disabled:opacity-50"
          aria-label="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex items-center border border-border rounded">
          <button
            onClick={() => handleQtyChange(optimisticQty - 1)}
            disabled={isPending}
            className="w-7 h-7 flex items-center justify-center text-text-primary hover:bg-brand-50 transition-colors disabled:opacity-50 text-sm"
            aria-label="Decrease"
          >
            −
          </button>
          <span className="w-8 text-center text-xs font-medium">{optimisticQty}</span>
          <button
            onClick={() => handleQtyChange(optimisticQty + 1)}
            disabled={isPending || optimisticQty >= maxStock}
            className="w-7 h-7 flex items-center justify-center text-text-primary hover:bg-brand-50 transition-colors disabled:opacity-50 text-sm"
            aria-label="Increase"
          >
            +
          </button>
        </div>

        <p className="text-xs font-semibold text-text-primary">
          {formatPrice(unitPrice * optimisticQty)}
        </p>
      </div>
    </div>
  )
}
