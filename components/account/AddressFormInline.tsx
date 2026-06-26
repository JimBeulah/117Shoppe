"use client"

import { useState } from "react"
import { AddressForm } from "@/components/account/AddressForm"
import { createAddress } from "@/app/(shop)/account/addresses/actions"

export function AddressFormInline() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors"
      >
        + Fill in address details
      </button>
    )
  }

  return (
    <AddressForm
      onSubmit={async (data) => {
        const result = await createAddress(data)
        if (!result.error) setOpen(false)
        return result
      }}
      onCancel={() => setOpen(false)}
    />
  )
}
