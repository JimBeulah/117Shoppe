"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import VariantMatrixBuilder from "@/components/seller/VariantMatrixBuilder"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { upsertProduct } from "@/lib/seller/actions"
import { productFormSchema, type ProductFormValues } from "@/lib/seller/product-validations"
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

  const initialParentCategoryId = (() => {
    if (!initial?.categoryId) return ""
    const cat = categories.find((c) => c.id === initial.categoryId)
    if (!cat) return ""
    return cat.parentId ?? initial.categoryId
  })()

  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.id))
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

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      parentCategoryId: initialParentCategoryId,
      categoryId: initial?.categoryId ?? "",
      price: initial?.price ?? 0,
      originalPrice: initial?.originalPrice ?? undefined,
      images: initial?.images ?? [],
      stock: initial?.stock ?? 0,
      isActive: initial?.isActive ?? true,
    },
  })

  const parentCategoryId = watch("parentCategoryId")
  const parentCategories = categories.filter((c) => c.parentId === null)
  const childCategories = categories.filter((c) => c.parentId === parentCategoryId)

  function handleNameChange(value: string) {
    setValue("name", value)
    if (!slugTouched) setValue("slug", slugify(value))
  }

  function handleParentChange(parentId: string) {
    setValue("parentCategoryId", parentId)
    const newChildren = categories.filter((c) => c.parentId === parentId)
    setValue("categoryId", newChildren.length > 0 ? "" : parentId)
  }

  function handleVariantToggle(checked: boolean) {
    setHasVariants(checked)
    if (!checked) {
      setVariantOptions([])
      setVariantMatrix({})
    }
  }

  const mutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const variants = hasVariants
        ? crossProduct(variantOptions).map((key) => ({
            name: key,
            price: variantMatrix[key]?.price ?? 0,
            stock: variantMatrix[key]?.stock ?? 0,
            sku: variantMatrix[key]?.sku || undefined,
            image: variantMatrix[key]?.image || undefined,
          }))
        : []

      const result = await upsertProduct({
        id: initial?.id,
        name: values.name,
        slug: values.slug,
        description: values.description,
        categoryId: values.categoryId,
        price: values.price,
        originalPrice: values.originalPrice,
        images: values.images,
        stock: values.stock,
        variantOptions: hasVariants ? variantOptions : null,
        variants,
        isActive: values.isActive,
      })

      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => router.push("/seller/products"),
  })

  const onSubmit = (values: ProductFormValues) => mutation.mutate(values)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {mutation.isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {mutation.error.message}
        </p>
      )}

      {/* Basic Info */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
        <h2 className="font-semibold text-text-primary">Basic Information</h2>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Product Name *</label>
          <input
            type="text"
            {...register("name")}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={200}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">URL Slug *</label>
          <input
            type="text"
            {...register("slug")}
            onChange={(e) => {
              setSlugTouched(true)
              setValue("slug", e.target.value)
            }}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Description *</label>
          <textarea
            {...register("description")}
            rows={4}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Category *</label>
            <select
              value={parentCategoryId}
              onChange={(e) => handleParentChange(e.target.value)}
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select category</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.parentCategoryId && (
              <p className="text-xs text-red-600">{errors.parentCategoryId.message}</p>
            )}
          </div>
          {childCategories.length > 0 && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-primary">Subcategory *</label>
              <select
                {...register("categoryId")}
                className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select subcategory</option>
                {childCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-red-600">{errors.categoryId.message}</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Price (₱) *</label>
            <input
              type="number"
              {...register("price", { valueAsNumber: true })}
              min={0}
              step="0.01"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.price && <p className="text-xs text-red-600">{errors.price.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">
              Original Price (₱)
              <span className="text-text-secondary font-normal ml-1 text-xs">(for strikethrough)</span>
            </label>
            <input
              type="number"
              {...register("originalPrice", {
                setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
              })}
              min={0}
              step="0.01"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.originalPrice && <p className="text-xs text-red-600">{errors.originalPrice.message}</p>}
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-3">
        <h2 className="font-semibold text-text-primary">Product Images</h2>
        <p className="text-xs text-text-secondary">Up to 9 images. First image is the cover.</p>
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <ProductImageUploader
              endpoint="productImages"
              value={field.value}
              onChange={field.onChange}
              maxFiles={9}
            />
          )}
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
              {...register("stock", { valueAsNumber: true })}
              min={0}
              className="w-32 border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.stock && <p className="text-xs text-red-600">{errors.stock.message}</p>}
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
          <input type="checkbox" {...register("isActive")} className="rounded border-border-default" />
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
          disabled={mutation.isPending}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded text-sm transition-colors"
        >
          {mutation.isPending ? "Saving…" : initial?.id ? "Save Changes" : "Create Product"}
        </button>
        <a href="/seller/products" className="text-sm text-text-secondary hover:underline">
          Cancel
        </a>
      </div>
    </form>
  )
}
