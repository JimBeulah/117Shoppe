"use client"

import { useState } from "react"

export function AddToCartButton() {
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState("")

  function handleAddToCart() {
    setMessage("Sign in to add items to your cart.")
    setTimeout(() => setMessage(""), 3000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Quantity</p>
        <div className="flex items-center border border-border rounded">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-brand-50 transition-colors"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium" aria-live="polite">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-brand-50 transition-colors"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <button
        onClick={handleAddToCart}
        className="w-full py-3 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
      >
        Add to Cart
      </button>
      {message && (
        <p className="text-xs text-text-secondary text-center" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
