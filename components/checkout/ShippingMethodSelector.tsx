"use client"

import { formatPrice } from "@/lib/utils"
import type { ShippingRateOption } from "@/lib/shipping/rates"

interface ShippingMethodSelectorProps {
  shopId: string
  options: ShippingRateOption[]
  loading: boolean
  value: string | null
  onChange: (shopId: string, methodId: string) => void
}

export function ShippingMethodSelector({ shopId, options, loading, value, onChange }: ShippingMethodSelectorProps) {
  if (loading) {
    return <p className="text-xs text-text-secondary">Loading shipping options…</p>
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-accent-sale">
        No shipping methods available for this address. Try a different address.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-text-secondary">Shipping Method</p>
      {options.map((option) => (
        <label
          key={option.methodId}
          className="flex items-start gap-2 p-2 rounded-lg border border-border-default cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
        >
          <input
            type="radio"
            name={`shippingMethod-${shopId}`}
            value={option.methodId}
            checked={value === option.methodId}
            onChange={() => onChange(shopId, option.methodId)}
            className="mt-1"
          />
          <div className="flex-1 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {option.name} <span className="text-text-secondary font-normal">— {option.carrier}</span>
              </p>
              <p className="text-xs text-text-secondary">
                {option.estimatedDaysMin}–{option.estimatedDaysMax} day{option.estimatedDaysMax > 1 ? "s" : ""}
              </p>
            </div>
            <p className="text-sm font-medium text-text-primary shrink-0">{formatPrice(option.price)}</p>
          </div>
        </label>
      ))}
    </div>
  )
}
