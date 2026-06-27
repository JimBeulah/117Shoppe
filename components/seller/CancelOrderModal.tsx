"use client"

import { useState, useTransition } from "react"
import { cancelOrder } from "@/lib/seller/actions"

interface Props {
  orderId: string
}

export default function CancelOrderModal({ orderId }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelOrder(orderId)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-500 border border-red-200 hover:bg-red-50 px-4 py-2 rounded transition-colors"
      >
        Cancel Order
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="font-semibold text-text-primary">Cancel this order?</h2>
            <p className="text-sm text-text-secondary">
              This action cannot be undone. The order status will be set to Cancelled.
            </p>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium py-2 rounded text-sm transition-colors"
              >
                {isPending ? "Cancelling…" : "Yes, Cancel Order"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-border-default text-text-secondary hover:bg-bg-page py-2 rounded text-sm transition-colors"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
