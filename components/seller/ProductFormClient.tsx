"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import VariantMatrixBuilder from "@/components/seller/VariantMatrixBuilder"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { upsertProduct } from "@/lib/seller/actions"
import { slugify, crossProduct } from "@/lib/utils"
import type { VariantOption, VariantCellData, CategoryItem } from "@/types/seller"

interface InitialProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  originalPrice: number | null
  images: string[]
  stock: number
  categoryId: string
  isActive: boolean
  variantOptions: VariantOption[] | null
  variants: { name: string; price: number; stock: number; sku: string | null; image: string | null }[]
}

interface Props {
  categories: CategoryItem[]
  initial?: InitialProduct
}

export default function ProductFormClient({ categories, initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const parentCategories = categories.filter((c) => c.parentId === null)

  const [name, setName] = useState(initial?.name ?? "")
  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [parentCategoryId, setParentCategoryId] = useState<string>(() => {
    if (!initial?.categoryId) return ""
    const cat = categories.find((c) => c.id === initial.categoryId)
    if (!cat) return ""
    return cat.parentId ?? initial.categoryId
  })
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "")
  const [price, setPrice] = useState(initial?.price?.toString() ?? "")
  const [originalPrice, setOriginalPrice] = useState(initial?.originalPrice?.toString() ?? "")
  const [images, setImages] = useState<string[]>(initial?.images ?? [])
  const [stock, setStock] = useState(initial?.stock?.toString() ?? "0")
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [hasVariants, setHasVariants] = useState(
    Boolean(initial?.variantOptions && (initial.variantOptions as VariantOption[]).length > 0)
  )
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>(
    (initial?.variantOptions as VariantOption[]) ?? []
  )
  const [variantMatrix, setVariantMatrix] = useState<Record<string, VariantCellData>>(() => {
    if (!initial?.variants?.length) return {}
    return Object.fromEntries(
      initial.variants.map((v) => [
        v.name,
        { price: v.price, stock: v.stock, sku: v.sku ?? "", image: v.image ?? "" },
      ])
    )
  })

  const childCategories = categories.filter((c) => c.parentId === parentCategoryId)

  function handleNameChange(value: string) {
    setName(value)
    if (!initial?.id) setSlug(slugify(value))
  }

  function handleParentChange(parentId: string) {
    setParentCategoryId(parentId)
    const newChildren = categories.filter((c) => c.parentId === parentId)
    setCategoryId(newChildren.length > 0 ? "" : parentId)
  }

  function handleVariantToggle(checked: boolean) {
    setHasVariants(checked)
    if (!checked) {
      setVariantOptions([])
      setVariantMatrix({})
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const variants = hasVariants
      ? crossProduct(variantOptions).map((key) => ({
          name: key,
          price: variantMatrix[key]?.price ?? 0,
          stock: variantMatrix[key]?.stock ?? 0,
          sku: variantMatrix[key]?.sku || undefined,
          image: variantMatrix[key]?.image || undefined,
        }))
      : []

    startTransition(async () => {
      const result = await upsertProduct({
        id: initial?.id,
        name,
        slug,
        description,
        categoryId,
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        images,
        stock: parseInt(stock, 10) || 0,
        variantOptions: hasVariants ? variantOptions : null,
        variants,
        isActive,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/seller/products")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Basic Info */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
        <h2 className="font-semibold text-text-primary">Basic Information</h2>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Product Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            maxLength={200}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">URL Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9-]+"
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Category *</label>
            <select
              value={parentCategoryId}
              onChange={(e) => handleParentChange(e.target.value)}
              required
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select category</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {childCategories.length > 0 && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-primary">Subcategory *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select subcategory</option>
                {childCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Price (₱) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min={0}
              step="0.01"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">
              Original Price (₱)
              <span className="text-text-secondary font-normal ml-1 text-xs">(for strikethrough)</span>
            </label>
            <input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              min={0}
              step="0.01"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-3">
        <h2 className="font-semibold text-text-primary">Product Images</h2>
        <p className="text-xs text-text-secondary">Up to 9 images. First image is the cover.</p>
        <ProductImageUploader
          endpoint="productImages"
          value={images}
          onChange={setImages}
          maxFiles={9}
        />
      </section>

      {/* Variants */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">Variants</h2>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={(e) => handleVariantToggle(e.target.checked)}
              className="rounded border-border-default"
            />
            This product has variants
          </label>
        </div>

        {!hasVariants ? (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Stock *</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required={!hasVariants}
              min={0}
              className="w-32 border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ) : (
          <VariantMatrixBuilder
            options={variantOptions}
            matrix={variantMatrix}
            onOptionsChange={setVariantOptions}
            onMatrixChange={setVariantMatrix}
          />
        )}
      </section>

      {/* Publish */}
      <section className="bg-white rounded-lg border border-border-default p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-border-default"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">Publish product</p>
            <p className="text-xs text-text-secondary">
              Inactive products are hidden from the shop. You can publish later.
            </p>
          </div>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded text-sm transition-colors"
        >
          {isPending ? "Saving…" : initial?.id ? "Save Changes" : "Create Product"}
        </button>
        <a href="/seller/products" className="text-sm text-text-secondary hover:underline">
          Cancel
        </a>
      </div>
    </form>
  )
}
