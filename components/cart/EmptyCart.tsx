import Link from "next/link"
import { ShoppingCart } from "lucide-react"

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center">
        <ShoppingCart className="w-10 h-10 text-brand-300" />
      </div>
      <div>
        <p className="text-base font-semibold text-text-primary">Your cart is empty</p>
        <p className="text-sm text-text-secondary mt-1">Add items to get started</p>
      </div>
      <Link
        href="/"
        className="mt-2 px-6 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
      >
        Shop Now
      </Link>
    </div>
  )
}
