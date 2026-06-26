"use client"

import { useState, useTransition } from "react"
import type { AddressItem } from "@/types"
import type { AddressFormData } from "@/app/(shop)/account/addresses/actions"

interface AddressFormProps {
  initial?: AddressItem
  onSubmit: (data: AddressFormData) => Promise<{ error?: string }>
  onCancel?: () => void
  submitLabel?: string
}

const PROVINCES = [
  "Metro Manila", "Cebu", "Davao", "Laguna", "Cavite", "Bulacan",
  "Rizal", "Pampanga", "Batangas", "Quezon", "Iloilo", "Negros Occidental",
  "Pangasinan", "Cagayan de Oro", "Zamboanga", "Other",
]

export function AddressForm({ initial, onSubmit, onCancel, submitLabel = "Save Address" }: AddressFormProps) {
  const [form, setForm] = useState<AddressFormData>({
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    street: initial?.street ?? "",
    city: initial?.city ?? "",
    province: initial?.province ?? "",
    postalCode: initial?.postalCode ?? "",
    isDefault: initial?.isDefault ?? false,
  })
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function set(field: keyof AddressFormData, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.fullName || !form.phone || !form.street || !form.city || !form.province || !form.postalCode) {
      setError("Please fill in all fields.")
      return
    }
    startTransition(async () => {
      const result = await onSubmit(form)
      if (result.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Full Name</label>
          <input
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Juan dela Cruz"
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="09XX XXX XXXX"
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Street / Barangay</label>
        <input
          value={form.street}
          onChange={(e) => set("street", e.target.value)}
          placeholder="123 Rizal St, Barangay San Antonio"
          className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">City / Municipality</label>
          <input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Makati City"
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Province</label>
          <select
            value={form.province}
            onChange={(e) => set("province", e.target.value)}
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600 bg-white"
          >
            <option value="">Select province</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Postal Code</label>
          <input
            value={form.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
            placeholder="1234"
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
          className="accent-brand-600"
        />
        Set as default address
      </label>

      {error && <p className="text-xs text-accent-sale">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-5 py-2 rounded-lg border border-border text-sm text-text-primary hover:bg-bg-subtle transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
