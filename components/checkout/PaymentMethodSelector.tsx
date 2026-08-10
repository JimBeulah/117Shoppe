"use client"

export type PaymentMethod = "COD" | "PAYMONGO"

interface PaymentMethodSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

const OPTIONS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "COD", label: "Cash on Delivery", description: "Pay with cash when your order arrives" },
  { value: "PAYMONGO", label: "Pay Online", description: "GCash, card, or GrabPay via PayMongo" },
]

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="bg-white rounded-lg border border-border p-4 space-y-2">
      <p className="text-sm font-semibold text-text-primary">Payment Method</p>
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          className="flex items-start gap-2 p-2 rounded-lg border border-border-default cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
        >
          <input
            type="radio"
            name="paymentMethod"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">{option.label}</p>
            <p className="text-xs text-text-secondary">{option.description}</p>
          </div>
        </label>
      ))}
    </div>
  )
}
