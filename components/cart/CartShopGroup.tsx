import Link from "next/link"
import { Store } from "lucide-react"
import { CartItemRow } from "@/components/cart/CartItemRow"
import type { CartGroup } from "@/types"

interface CartShopGroupProps {
  group: CartGroup
}

export function CartShopGroup({ group }: CartShopGroupProps) {
  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Shop header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-subtle">
        <Store className="w-4 h-4 text-brand-600 shrink-0" />
        <Link
          href={`/shop/${group.shopSlug}`}
          className="text-sm font-semibold text-text-primary hover:text-brand-600 transition-colors"
        >
          {group.shopName}
        </Link>
      </div>

      {group.isOnVacation && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs">
          This seller is on vacation. Items from this shop cannot be checked out right now.
        </div>
      )}

      {/* Items */}
      <div className="px-4">
        {group.items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
