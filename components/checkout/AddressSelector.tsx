"use client"

import { useState } from "react"
import { MapPin, ChevronDown, ChevronUp } from "lucide-react"
import { AddressForm } from "@/components/account/AddressForm"
import { createAddress } from "@/app/(shop)/account/addresses/actions"
import type { AddressItem } from "@/types"

interface AddressSelectorProps {
  addresses: AddressItem[]
  selectedId: string
  onSelect: (id: string) => void
}

export function AddressSelector({ addresses, selectedId, onSelect }: AddressSelectorProps) {
  const [showForm, setShowForm] = useState(addresses.length === 0)

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-bg-subtle">
        <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-brand-600" />
          Delivery Address
        </p>
      </div>

      <div className="p-4 space-y-3">
        {addresses.map((address) => (
          <label
            key={address.id}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedId === address.id
                ? "border-brand-600 bg-brand-50"
                : "border-border hover:border-brand-300"
            }`}
          >
            <input
              type="radio"
              name="addressId"
              value={address.id}
              checked={selectedId === address.id}
              onChange={() => onSelect(address.id)}
              className="mt-0.5 accent-brand-600"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary">{address.fullName}</p>
                <span className="text-xs text-text-secondary">{address.phone}</span>
                {address.isDefault && (
                  <span className="text-[10px] font-bold text-brand-600 border border-brand-300 px-1 py-0.5 rounded">
                    DEFAULT
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {address.street}, {address.barangay}, {address.city}, {address.province} {address.postalCode}
              </p>
            </div>
          </label>
        ))}

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors"
        >
          {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showForm ? "Hide form" : "+ Add new address"}
        </button>

        {showForm && (
          <div className="pt-1 border-t border-border">
            <AddressForm
              onSubmit={async (data) => {
                const result = await createAddress(data)
                if (!result.error) setShowForm(false)
                return result
              }}
              onCancel={() => setShowForm(false)}
              submitLabel="Save & Use This Address"
            />
          </div>
        )}
      </div>
    </div>
  )
}
