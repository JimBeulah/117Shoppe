"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { updateShop } from "@/lib/seller/actions"

interface Props {
  initialName: string
  initialLogo: string | null
  initialBanner: string | null
  slug: string
}

export default function ShopSettingsForm({ initialName, initialLogo, initialBanner, slug }: Props) {
  const [name, setName] = useState(initialName)
  const [logo, setLogo] = useState<string[]>(initialLogo ? [initialLogo] : [])
  const [banner, setBanner] = useState<string[]>(initialBanner ? [initialBanner] : [])
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.set("name", name)
    if (logo[0]) formData.set("logo", logo[0])
    if (banner[0]) formData.set("banner", banner[0])

    startTransition(async () => {
      const result = await updateShop(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Shop updated!")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Shop Name */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={60}
          placeholder="My Awesome Shop"
          className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Shop URL (read-only) */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop URL</label>
        <div className="flex items-center gap-1 px-3 py-2 border border-border-default rounded bg-bg-page text-sm text-text-secondary">
          eshopee.com/shop/{slug}
        </div>
        <p className="text-xs text-text-secondary">Shop URL cannot be changed.</p>
      </div>

      {/* Logo */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop Logo</label>
        <ProductImageUploader
          endpoint="shopLogo"
          value={logo}
          onChange={setLogo}
          maxFiles={1}
          label="Upload Logo"
        />
      </div>

      {/* Banner */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop Banner</label>
        <ProductImageUploader
          endpoint="shopBanner"
          value={banner}
          onChange={setBanner}
          maxFiles={1}
          label="Upload Banner"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded text-sm transition-colors"
      >
        {isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  )
}
