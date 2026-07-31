"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { updateShop } from "@/lib/seller/actions"
import { updateShopSchema, type UpdateShopInput } from "@/lib/seller/validations"

interface Props {
  initialName: string
  initialLogo: string | null
  initialBanner: string | null
  slug: string
}

export default function ShopSettingsForm({ initialName, initialLogo, initialBanner, slug }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateShopInput>({
    resolver: zodResolver(updateShopSchema),
    defaultValues: {
      name: initialName,
      logo: initialLogo ? [initialLogo] : [],
      banner: initialBanner ? [initialBanner] : [],
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: UpdateShopInput) => {
      const formData = new FormData()
      formData.set("name", values.name)
      if (values.logo[0]) formData.set("logo", values.logo[0])
      if (values.banner[0]) formData.set("banner", values.banner[0])
      const result = await updateShop(formData)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => toast.success("Shop updated!"),
    onError: (error) => toast.error(error.message),
  })

  const onSubmit = (values: UpdateShopInput) => mutation.mutate(values)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {/* Shop Name */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop Name</label>
        <input
          type="text"
          {...register("name")}
          maxLength={60}
          placeholder="My Awesome Shop"
          className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {/* Shop URL (read-only) */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop URL</label>
        <div className="flex items-center gap-1 px-3 py-2 border border-border-default rounded bg-bg-page text-sm text-text-secondary">
          117shoppe.com/shop/{slug}
        </div>
        <p className="text-xs text-text-secondary">Shop URL cannot be changed.</p>
      </div>

      {/* Logo */}
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

      {/* Banner */}
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
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded text-sm transition-colors"
      >
        {mutation.isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  )
}
