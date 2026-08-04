"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { createShop } from "@/lib/seller/actions"
import { createShopSchema, type CreateShopInput } from "@/lib/seller/validations"
import { slugify } from "@/lib/utils"

export default function OnboardingForm() {
  const [slugTouched, setSlugTouched] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: { name: "", slug: "", logo: [], banner: [] },
  })

  const mutation = useMutation({
    mutationFn: async (values: CreateShopInput) => {
      const formData = new FormData()
      formData.set("name", values.name)
      formData.set("slug", values.slug)
      if (values.logo[0]) formData.set("logo", values.logo[0])
      if (values.banner[0]) formData.set("banner", values.banner[0])
      const result = await createShop(formData)
      if (result?.error) throw new Error(result.error)
      return result
    },
  })

  function handleNameChange(value: string) {
    setValue("name", value)
    if (!slugTouched) setValue("slug", slugify(value))
  }

  const onSubmit = (values: CreateShopInput) => mutation.mutate(values)

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full bg-white rounded-lg border border-border-default p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Open your shop</h1>
          <p className="text-sm text-text-secondary mt-1">
            Fill in your shop details. Our team will review and approve your application within 1–2 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {mutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {mutation.error.message}
            </p>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop Name *</label>
            <input
              type="text"
              {...register("name")}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={60}
              placeholder="My Awesome Shop"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop URL *</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-text-secondary">117shoppe.com/shop/</span>
              <input
                type="text"
                {...register("slug")}
                onChange={(e) => {
                  setSlugTouched(true)
                  setValue("slug", e.target.value)
                }}
                placeholder="my-awesome-shop"
                className="flex-1 border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop Logo</label>
            <Controller
              control={control}
              name="logo"
              render={({ field }) => (
                <ProductImageUploader
                  endpoint="shopLogo"
                  value={field.value}
                  onChange={field.onChange}
                  maxFiles={1}
                  label="Upload Logo"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop Banner</label>
            <Controller
              control={control}
              name="banner"
              render={({ field }) => (
                <ProductImageUploader
                  endpoint="shopBanner"
                  value={field.value}
                  onChange={field.onChange}
                  maxFiles={1}
                  label="Upload Banner"
                />
              )}
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {mutation.isPending ? "Submitting…" : "Submit for Review"}
          </button>
        </form>
      </div>
    </div>
  )
}
