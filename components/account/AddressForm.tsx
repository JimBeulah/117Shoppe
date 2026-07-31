"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import type { AddressItem } from "@/types"
import type { AddressFormData } from "@/app/(shop)/account/addresses/actions"
import { addressSchema } from "@/lib/validations/address"

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: initial?.fullName ?? "",
      phone: initial?.phone ?? "",
      street: initial?.street ?? "",
      city: initial?.city ?? "",
      province: initial?.province ?? "",
      postalCode: initial?.postalCode ?? "",
      isDefault: initial?.isDefault ?? false,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const result = await onSubmit(data)
      if (result.error) throw new Error(result.error)
      return result
    },
  })

  const submit = (data: AddressFormData) => mutation.mutate(data)

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Full Name</label>
          <input
            {...register("fullName")}
            placeholder="Juan dela Cruz"
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
          {errors.fullName && <p className="text-xs text-accent-sale mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Phone</label>
          <input
            {...register("phone")}
            placeholder="09XX XXX XXXX"
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
          {errors.phone && <p className="text-xs text-accent-sale mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Street / Barangay</label>
        <input
          {...register("street")}
          placeholder="123 Rizal St, Barangay San Antonio"
          className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
        {errors.street && <p className="text-xs text-accent-sale mt-1">{errors.street.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">City / Municipality</label>
          <input
            {...register("city")}
            placeholder="Makati City"
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
          {errors.city && <p className="text-xs text-accent-sale mt-1">{errors.city.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Province</label>
          <select
            {...register("province")}
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600 bg-white"
          >
            <option value="">Select province</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {errors.province && <p className="text-xs text-accent-sale mt-1">{errors.province.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Postal Code</label>
          <input
            {...register("postalCode")}
            placeholder="1234"
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
          {errors.postalCode && <p className="text-xs text-accent-sale mt-1">{errors.postalCode.message}</p>}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
        <input type="checkbox" {...register("isDefault")} className="accent-brand-600" />
        Set as default address
      </label>

      {mutation.isError && <p className="text-xs text-accent-sale">{mutation.error.message}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={mutation.isPending}
            className="px-5 py-2 rounded-lg border border-border text-sm text-text-primary hover:bg-bg-subtle transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
