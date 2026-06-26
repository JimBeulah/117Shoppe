"use client"

import { useState, useTransition } from "react"
import { MapPin, Star, Pencil, Trash2 } from "lucide-react"
import { AddressForm } from "@/components/account/AddressForm"
import { updateAddress, deleteAddress, setDefaultAddress } from "@/app/(shop)/account/addresses/actions"
import type { AddressItem } from "@/types"

interface AddressCardProps {
  address: AddressItem
}

export function AddressCard({ address }: AddressCardProps) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm("Delete this address?")) return
    startTransition(async () => {
      await deleteAddress(address.id)
    })
  }

  function handleSetDefault() {
    startTransition(async () => {
      await setDefaultAddress(address.id)
    })
  }

  if (editing) {
    return (
      <div className="bg-white rounded-lg border border-brand-300 p-4">
        <AddressForm
          initial={address}
          onSubmit={async (data) => {
            const result = await updateAddress(address.id, data)
            if (!result.error) setEditing(false)
            return result
          }}
          onCancel={() => setEditing(false)}
          submitLabel="Update Address"
        />
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-4 space-y-2 ${address.isDefault ? "border-brand-600" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">{address.fullName}</p>
              <span className="text-xs text-text-secondary">·</span>
              <p className="text-xs text-text-secondary">{address.phone}</p>
              {address.isDefault && (
                <span className="text-[10px] font-bold text-brand-600 border border-brand-300 px-1.5 py-0.5 rounded">
                  DEFAULT
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              {address.street}, {address.city}, {address.province} {address.postalCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditing(true)}
            disabled={isPending}
            className="text-text-secondary hover:text-brand-600 transition-colors"
            aria-label="Edit address"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-text-secondary hover:text-accent-sale transition-colors"
            aria-label="Delete address"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!address.isDefault && (
        <button
          onClick={handleSetDefault}
          disabled={isPending}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors disabled:opacity-50"
        >
          <Star className="w-3 h-3" />
          Set as default
        </button>
      )}
    </div>
  )
}
