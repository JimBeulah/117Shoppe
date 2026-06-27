import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getAllCategories, getSellerProductForEdit } from "@/lib/seller/queries"
import ProductFormClient from "@/components/seller/ProductFormClient"
import type { VariantOption } from "@/types/seller"

export const metadata = { title: "Edit Product" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const [product, categories] = await Promise.all([
    getSellerProductForEdit(id, shop.id),
    getAllCategories(),
  ])

  if (!product) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Edit Product</h1>
      <ProductFormClient
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          images: product.images,
          stock: product.stock,
          categoryId: product.categoryId,
          isActive: product.isActive,
          variantOptions: product.variantOptions as VariantOption[] | null,
          variants: product.variants.map((v) => ({
            name: v.name,
            price: v.price,
            stock: v.stock,
            sku: v.sku,
            image: v.image,
          })),
        }}
      />
    </div>
  )
}
