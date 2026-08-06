"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import type { AddressItem } from "@/types"
import type { AddressFormData } from "@/app/(shop)/account/addresses/actions"
import { addressSchema } from "@/lib/validations/address"
import { fetchBarangays, fetchCities, fetchProvinces } from "@/lib/psgc"

interface AddressFormProps {
  initial?: AddressItem
  onSubmit: (data: AddressFormData) => Promise<{ error?: string }>
  onCancel?: () => void
  submitLabel?: string
}

export function AddressForm({ initial, onSubmit, onCancel, submitLabel = "Save Address" }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: initial?.fullName ?? "",
      phone: initial?.phone ?? "",
      street: initial?.street ?? "",
      barangay: initial?.barangay ?? "",
      city: initial?.city ?? "",
      province: initial?.province ?? "",
      postalCode: initial?.postalCode ?? "",
      isDefault: initial?.isDefault ?? false,
    },
  })

  const [provinceCode, setProvinceCode] = useState("")
  const [cityCode, setCityCode] = useState("")

  const provincesQuery = useQuery({
    queryKey: ["psgc-provinces"],
    queryFn: fetchProvinces,
    staleTime: Infinity,
  })

  const citiesQuery = useQuery({
    queryKey: ["psgc-cities", provinceCode],
    queryFn: () => fetchCities(provinceCode),
    enabled: !!provinceCode,
    staleTime: Infinity,
  })

  const barangaysQuery = useQuery({
    queryKey: ["psgc-barangays", cityCode],
    queryFn: () => fetchBarangays(cityCode),
    enabled: !!cityCode,
    staleTime: Infinity,
  })

  // Best-effort pre-select province/city when editing an existing address.
  useEffect(() => {
    if (!initial?.province || provinceCode || !provincesQuery.data) return
    const province = provincesQuery.data.find((p) => p.name === initial.province)
    if (!province) return
    setProvinceCode(province.code)
    let cancelled = false
    ;(async () => {
      const cities = await fetchCities(province.code)
      const city = cities.find((c) => c.name === initial.city)
      if (city && !cancelled) setCityCode(city.code)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.province, initial?.city, provincesQuery.data])

  function handleProvinceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value
    const name = provincesQuery.data?.find((p) => p.code === code)?.name ?? ""
    setProvinceCode(code)
    setCityCode("")
    setValue("province", name, { shouldValidate: true })
    setValue("city", "")
    setValue("barangay", "")
  }

  function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value
    const name = citiesQuery.data?.find((c) => c.code === code)?.name ?? ""
    setCityCode(code)
    setValue("city", name, { shouldValidate: true })
    setValue("barangay", "")
  }

  function handleBarangayChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setValue("barangay", e.target.value, { shouldValidate: true })
  }

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Province</label>
          <select
            value={provinceCode}
            onChange={handleProvinceChange}
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600 bg-white"
          >
            <option value="">Select province</option>
            {provincesQuery.data?.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
          <input type="hidden" {...register("province")} />
          {errors.province && <p className="text-xs text-accent-sale mt-1">{errors.province.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">City / Municipality</label>
          <select
            value={cityCode}
            onChange={handleCityChange}
            disabled={!citiesQuery.data?.length}
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600 bg-white disabled:bg-bg-subtle disabled:text-text-secondary"
          >
            <option value="">
              {citiesQuery.data?.length ? "Select city / municipality" : "Select province first"}
            </option>
            {citiesQuery.data?.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <input type="hidden" {...register("city")} />
          {errors.city && <p className="text-xs text-accent-sale mt-1">{errors.city.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Barangay</label>
          <select
            value={watch("barangay")}
            onChange={handleBarangayChange}
            disabled={!barangaysQuery.data?.length}
            className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600 bg-white disabled:bg-bg-subtle disabled:text-text-secondary"
          >
            <option value="" disabled hidden>
              {barangaysQuery.data?.length ? "Select barangay" : "Select city first"}
            </option>
            {barangaysQuery.data?.map((b) => (
              <option key={b.code} value={b.name}>{b.name}</option>
            ))}
          </select>
          {errors.barangay && <p className="text-xs text-accent-sale mt-1">{errors.barangay.message}</p>}
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

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Street</label>
        <input
          {...register("street")}
          placeholder="123 Rizal St, Blk 4 Lot 7"
          className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
        {errors.street && <p className="text-xs text-accent-sale mt-1">{errors.street.message}</p>}
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
