"use client"

import { useEffect, useState } from "react"
import { AddressSelector } from "@/components/checkout/AddressSelector"
import { OrderReviewSection } from "@/components/checkout/OrderReviewSection"
import { VoucherInput, type AppliedVoucherState } from "@/components/checkout/VoucherInput"
import { PlaceOrderButton } from "@/components/checkout/PlaceOrderButton"
import { PaymentMethodSelector, type PaymentMethod } from "@/components/checkout/PaymentMethodSelector"
import { getShippingOptionsForAddress } from "@/app/(shop)/checkout/actions"
import type { AddressItem, CartGroup } from "@/types"
import type { ShippingRateOption } from "@/lib/shipping/rates"

interface CheckoutShellProps {
  addresses: AddressItem[]
  groups: CartGroup[]
}

export function CheckoutShell({ addresses, groups }: CheckoutShellProps) {
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0]
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "")
  const [applied, setApplied] = useState<AppliedVoucherState | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD")
  const [shippingOptions, setShippingOptions] = useState<Record<string, ShippingRateOption[]>>({})
  const [shippingLoading, setShippingLoading] = useState(false)
  const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!selectedAddressId) return
    let cancelled = false
    setShippingLoading(true)
    getShippingOptionsForAddress(selectedAddressId).then((result) => {
      if (cancelled) return
      const options = result.options ?? {}
      setShippingOptions(options)
      setSelectedMethods((prev) => {
        const next: Record<string, string> = {}
        for (const shopId of Object.keys(options)) {
          const stillValid = options[shopId].some((o) => o.methodId === prev[shopId])
          next[shopId] = stillValid ? prev[shopId] : (options[shopId][0]?.methodId ?? "")
        }
        return next
      })
      setShippingLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [selectedAddressId])

  function handleSelectMethod(shopId: string, methodId: string) {
    setSelectedMethods((prev) => ({ ...prev, [shopId]: methodId }))
  }

  const subtotal = groups.reduce((acc, group) =>
    acc + group.items.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price
      return sum + price * item.quantity
    }, 0), 0)

  const shippingTotal = groups.reduce((sum, group) => {
    const methodId = selectedMethods[group.shopId]
    const option = shippingOptions[group.shopId]?.find((o) => o.methodId === methodId)
    return sum + (option?.price ?? 0)
  }, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-4">
        <AddressSelector
          addresses={addresses}
          selectedId={selectedAddressId}
          onSelect={setSelectedAddressId}
        />
        <VoucherInput applied={applied} onApply={setApplied} onRemove={() => setApplied(null)} />
        <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
        <OrderReviewSection
          groups={groups}
          discountAmount={applied?.discountAmount ?? 0}
          voucherShopId={applied?.voucher.shopId ?? null}
          shippingOptions={shippingOptions}
          shippingLoading={shippingLoading}
          selectedMethods={selectedMethods}
          onSelectMethod={handleSelectMethod}
        />
      </div>
      <PlaceOrderButton
        addressId={selectedAddressId}
        total={subtotal}
        shippingTotal={shippingTotal}
        shopCount={groups.length}
        voucherCode={applied?.voucher.code ?? null}
        discountAmount={applied?.discountAmount ?? 0}
        paymentMethod={paymentMethod}
        shippingSelections={selectedMethods}
        shippingReady={groups.every((g) => !!selectedMethods[g.shopId])}
      />
    </div>
  )
}
