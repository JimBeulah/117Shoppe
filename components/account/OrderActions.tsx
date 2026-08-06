"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { cancelOrder, markOrderReceived } from "@/app/(shop)/account/orders/actions"

interface Props {
  orderId: string
  status: string
}

export function OrderActions({ orderId, status }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<"cancel" | "receive" | null>(null)

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const result = await cancelOrder(orderId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      toast.success("Order cancelled")
      setConfirming(null)
      router.refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const result = await markOrderReceived(orderId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      toast.success("Order marked as received")
      setConfirming(null)
      router.refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const canCancel = status === "PENDING" || status === "PAID"
  const canReceive = status === "SHIPPED"

  if (!canCancel && !canReceive) return null

  return (
    <div className="flex items-center justify-end gap-3">
      {canCancel && (
        <button
          type="button"
          onClick={() => setConfirming("cancel")}
          className="text-sm text-red-500 border border-red-200 hover:bg-red-50 px-4 py-2 rounded transition-colors"
        >
          Cancel Order
        </button>
      )}
      {canReceive && (
        <button
          type="button"
          onClick={() => setConfirming("receive")}
          className="text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded transition-colors"
        >
          Order Received
        </button>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirming(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            {confirming === "cancel" ? (
              <>
                <h2 className="font-semibold text-text-primary">Cancel this order?</h2>
                <p className="text-sm text-text-secondary">
                  This action cannot be undone. The order will be marked as cancelled.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-semibold text-text-primary">Confirm order received?</h2>
                <p className="text-sm text-text-secondary">
                  Only confirm once you have received your item(s). This action cannot be undone.
                </p>
              </>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  confirming === "cancel" ? cancelMutation.mutate() : receiveMutation.mutate()
                }
                disabled={cancelMutation.isPending || receiveMutation.isPending}
                className={`flex-1 disabled:opacity-50 text-white font-medium py-2 rounded text-sm transition-colors ${
                  confirming === "cancel"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-brand-600 hover:bg-brand-700"
                }`}
              >
                {cancelMutation.isPending || receiveMutation.isPending
                  ? "Please wait…"
                  : confirming === "cancel"
                    ? "Yes, Cancel Order"
                    : "Yes, I Received It"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="flex-1 border border-border-default text-text-secondary hover:bg-bg-page py-2 rounded text-sm transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
