"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { createShop } from "@/lib/seller/actions"
import { slugify } from "@/lib/utils"

export default function OnboardingPage() {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [logo, setLogo] = useState<string[]>([])
  const [banner, setBanner] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleNameChange(value: string) {
    setName(value)
    setSlug(slugify(value))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const formData = new FormData()
    formData.set("name", name)
    formData.set("slug", slug)
    if (logo[0]) formData.set("logo", logo[0])
    if (banner[0]) formData.set("banner", banner[0])

    startTransition(async () => {
      const result = await createShop(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full bg-white rounded-lg border border-border-default p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Open your shop</h1>
          <p className="text-sm text-text-secondary mt-1">
            Fill in your shop details. Our team will review and approve your application within 1–2 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={60}
              placeholder="My Awesome Shop"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop URL *</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-text-secondary">eshopee.com/shop/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
                placeholder="my-awesome-shop"
                className="flex-1 border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

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
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {isPending ? "Submitting…" : "Submit for Review"}
          </button>
        </form>
      </div>
    </div>
  )
}
