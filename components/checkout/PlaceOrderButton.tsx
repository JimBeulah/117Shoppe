"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { placeOrder } from "@/app/(shop)/checkout/actions"
import { formatPrice } from "@/lib/utils"

const SHIPPING_FEE = 49

interface PlaceOrderButtonProps {
  addressId: string
  total: number
  shopCount: number
  voucherCode?: string | null
  discountAmount?: number
}

export function PlaceOrderButton({
  addressId,
  total,
  shopCount,
  voucherCode = null,
  discountAmount = 0,
}: PlaceOrderButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const grandTotal = total - discountAmount + shopCount * SHIPPING_FEE

  function handlePlaceOrder() {
    if (!addressId) {
      setError("Please select a delivery address.")
      return
    }
    setError("")
    startTransition(async () => {
      const result = await placeOrder(addressId, "COD", voucherCode ?? undefined)
      if (result.error) {
        setError(result.error)
        return
      }
      const firstOrderId = result.orderIds?.[0]
      router.push(`/checkout/confirmation?orderId=${firstOrderId}`)
    })
  }

  return (
    <div className="bg-white rounded-lg border border-border p-4 space-y-3">
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-text-secondary">
          <span>Shipping ({shopCount} shop{shopCount > 1 ? "s" : ""})</span>
          <span>{formatPrice(shopCount * SHIPPING_FEE)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-text-secondary">
            <span>Voucher discount</span>
            <span className="text-green-600">-{formatPrice(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-text-primary border-t border-border pt-2">
          <span>Total Payment</span>
          <span className="text-accent-sale text-base">{formatPrice(grandTotal)}</span>
        </div>
      </div>

      <div className="text-xs text-text-secondary flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full border-2 border-brand-300 flex items-center justify-center text-brand-600 font-bold text-[10px]">₱</span>
        Cash on Delivery (COD)
      </div>

      {error && <p className="text-xs text-accent-sale">{error}</p>}

      <button
        onClick={handlePlaceOrder}
        disabled={isPending || !addressId}
        className="w-full py-3 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Placing Order…" : "Place Order"}
      </button>
    </div>
  )
}
