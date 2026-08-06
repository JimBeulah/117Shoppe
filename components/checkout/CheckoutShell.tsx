"use client"

import { useState } from "react"
import { AddressSelector } from "@/components/checkout/AddressSelector"
import { OrderReviewSection } from "@/components/checkout/OrderReviewSection"
import { VoucherInput, type AppliedVoucherState } from "@/components/checkout/VoucherInput"
import { PlaceOrderButton } from "@/components/checkout/PlaceOrderButton"
import type { AddressItem, CartGroup } from "@/types"

interface CheckoutShellProps {
  addresses: AddressItem[]
  groups: CartGroup[]
}

export function CheckoutShell({ addresses, groups }: CheckoutShellProps) {
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0]
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "")
  const [applied, setApplied] = useState<AppliedVoucherState | null>(null)

  const subtotal = groups.reduce((acc, group) =>
    acc + group.items.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price
      return sum + price * item.quantity
    }, 0), 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-4">
        <AddressSelector
          addresses={addresses}
          selectedId={selectedAddressId}
          onSelect={setSelectedAddressId}
        />
        <VoucherInput applied={applied} onApply={setApplied} onRemove={() => setApplied(null)} />
        <OrderReviewSection groups={groups} discountAmount={applied?.discountAmount ?? 0} />
      </div>
      <PlaceOrderButton
        addressId={selectedAddressId}
        total={subtotal}
        shopCount={groups.length}
        voucherCode={applied?.voucher.code ?? null}
        discountAmount={applied?.discountAmount ?? 0}
      />
    </div>
  )
}
