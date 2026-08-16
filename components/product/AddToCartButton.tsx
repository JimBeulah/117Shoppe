"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addToCart } from "@/app/(shop)/cart/actions"

interface AddToCartButtonProps {
  productId: string
  variantId: string | null
  stock: number
  outOfStockLabel?: string
}

export function AddToCartButton({ productId, variantId, stock, outOfStockLabel = "Out of Stock" }: AddToCartButtonProps) {
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleAddToCart() {
    if (stock <= 0) return
    startTransition(async () => {
      const result = await addToCart(productId, variantId, qty)
      if (result.error) {
        setMessage(result.error)
      } else {
        setMessage("Added to cart!")
      }
      setTimeout(() => setMessage(""), 3000)
    })
  }

  function handleBuyNow() {
    if (stock <= 0) return
    startTransition(async () => {
      const result = await addToCart(productId, variantId, qty)
      if (result.error) {
        setMessage(result.error)
        setTimeout(() => setMessage(""), 3000)
        return
      }
      router.push("/checkout")
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Quantity</p>
        <div className="flex items-center border border-border rounded">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-brand-50 transition-colors disabled:opacity-50"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium" aria-live="polite">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            disabled={isPending || qty >= stock}
            className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-brand-50 transition-colors disabled:opacity-50"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleAddToCart}
          disabled={isPending || stock <= 0}
          className="flex-1 py-3 rounded-lg border border-brand-600 text-brand-600 font-semibold text-sm hover:bg-brand-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Adding…" : stock <= 0 ? outOfStockLabel : "Add to Cart"}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={isPending || stock <= 0}
          className="flex-1 py-3 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Buy Now
        </button>
      </div>
      {message && (
        <p className="text-xs text-text-secondary text-center" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
