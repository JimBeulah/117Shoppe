import Image from "next/image"
import { formatPrice } from "@/lib/utils"
import { splitProportionally } from "@/lib/voucher"
import { ShippingMethodSelector } from "@/components/checkout/ShippingMethodSelector"
import type { CartGroup } from "@/types"
import type { ShippingRateOption } from "@/lib/shipping/rates"

interface OrderReviewSectionProps {
  groups: CartGroup[]
  discountAmount?: number
  voucherShopId?: string | null
  shippingOptions: Record<string, ShippingRateOption[]>
  shippingLoading: boolean
  selectedMethods: Record<string, string>
  onSelectMethod: (shopId: string, methodId: string) => void
}

export function OrderReviewSection({
  groups,
  discountAmount = 0,
  voucherShopId = null,
  shippingOptions,
  shippingLoading,
  selectedMethods,
  onSelectMethod,
}: OrderReviewSectionProps) {
  const subtotals = groups.map((group) =>
    group.items.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price
      return sum + price * item.quantity
    }, 0)
  )
  const groupDiscounts = voucherShopId
    ? groups.map((group) => (group.shopId === voucherShopId ? discountAmount : 0))
    : splitProportionally(discountAmount, subtotals)

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => {
        const subtotal = subtotals[groupIndex]
        const groupDiscount = groupDiscounts[groupIndex]
        const options = shippingOptions[group.shopId] ?? []
        const selectedMethodId = selectedMethods[group.shopId] ?? null
        const selectedOption = options.find((o) => o.methodId === selectedMethodId)
        const shippingFee = selectedOption?.price ?? 0

        return (
          <div key={group.shopId} className="bg-white rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-bg-subtle">
              <p className="text-sm font-semibold text-text-primary">{group.shopName}</p>
            </div>
            <div className="divide-y divide-border">
              {group.items.map((item) => {
                const price = item.variant?.price ?? item.product.price
                return (
                  <div key={item.id} className="flex gap-3 px-4 py-3">
                    <div className="relative w-14 h-14 shrink-0 rounded overflow-hidden bg-bg-subtle">
                      {item.product.images[0] && (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary line-clamp-1">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-xs text-text-secondary">{item.variant.name}</p>
                      )}
                      <p className="text-xs text-text-secondary mt-0.5">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-text-primary shrink-0">
                      {formatPrice(price * item.quantity)}
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-3 border-t border-border bg-bg-subtle space-y-3">
              <ShippingMethodSelector
                shopId={group.shopId}
                options={options}
                loading={shippingLoading}
                value={selectedMethodId}
                onChange={onSelectMethod}
              />
              {groupDiscount > 0 && (
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Voucher discount</span>
                  <span className="text-green-600">-{formatPrice(groupDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-text-primary">
                <span>Shop subtotal</span>
                <span className="text-accent-sale">
                  {formatPrice(subtotal + shippingFee - groupDiscount)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
