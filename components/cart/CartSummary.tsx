import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import type { CartGroup } from "@/types"

const SHIPPING_FEE_PER_SHOP = 49

interface CartSummaryProps {
  groups: CartGroup[]
}

export function CartSummary({ groups }: CartSummaryProps) {
  const subtotal = groups.reduce((acc, group) =>
    acc + group.items.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price
      return sum + price * item.quantity
    }, 0), 0)

  const shippingFee = groups.length * SHIPPING_FEE_PER_SHOP
  const total = subtotal + shippingFee

  return (
    <div className="bg-white rounded-lg border border-border p-4 space-y-3 sticky top-4">
      <h2 className="text-sm font-semibold text-text-primary">Order Summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-text-secondary">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Shipping ({groups.length} shop{groups.length > 1 ? "s" : ""})</span>
          <span>{formatPrice(shippingFee)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between font-semibold text-text-primary">
          <span>Total</span>
          <span className="text-accent-sale">{formatPrice(total)}</span>
        </div>
      </div>

      <Link
        href="/checkout"
        className="block w-full py-3 rounded-lg bg-brand-600 text-white text-sm font-semibold text-center hover:bg-brand-700 transition-colors"
      >
        Proceed to Checkout
      </Link>
    </div>
  )
}
