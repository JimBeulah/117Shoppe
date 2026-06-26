"use client"

import { useState } from "react"
import { AddressSelector } from "@/components/checkout/AddressSelector"
import { OrderReviewSection } from "@/components/checkout/OrderReviewSection"
import { PlaceOrderButton } from "@/components/checkout/PlaceOrderButton"
import type { AddressItem, CartGroup } from "@/types"

interface CheckoutShellProps {
  addresses: AddressItem[]
  groups: CartGroup[]
}

export function CheckoutShell({ addresses, groups }: CheckoutShellProps) {
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0]
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "")

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
        <OrderReviewSection groups={groups} />
      </div>
      <PlaceOrderButton
        addressId={selectedAddressId}
        total={subtotal}
        shopCount={groups.length}
      />
    </div>
  )
}
