"use client"

import { useState } from "react"
import { ReviewModal } from "@/components/reviews/ReviewModal"

interface RateButtonProps {
  productId: string
  productSlug: string
  productName: string
  orderId: string
}

export function RateButton({ productId, productSlug, productName, orderId }: RateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs border border-brand-600 text-brand-600 hover:bg-brand-50 rounded px-3 py-1.5 transition-colors font-medium"
      >
        Rate
      </button>
      {open && (
        <ReviewModal
          productId={productId}
          productSlug={productSlug}
          productName={productName}
          orderId={orderId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
