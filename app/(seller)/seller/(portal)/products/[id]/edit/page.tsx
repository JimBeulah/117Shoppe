import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getAllCategories, getAllBrands, getSellerProductForEdit } from "@/lib/seller/queries"
import { getShopAccess, canAccess } from "@/lib/seller/access"
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

  const access = await getShopAccess()
  if (!access) redirect("/seller/onboarding")
  if (!canAccess(access, "PRODUCTS")) redirect("/seller/dashboard")
  const shop = access.shop

  const [product, categories, brands] = await Promise.all([
    getSellerProductForEdit(id, shop.id),
    getAllCategories(),
    getAllBrands(),
  ])

  if (!product) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Edit Product</h1>
      <ProductFormClient
        categories={categories}
        brands={brands}
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
          brandId: product.brandId,
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
