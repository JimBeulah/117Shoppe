import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getAllCategories, getAllBrands } from "@/lib/seller/queries"
import { getShopAccess, canAccess } from "@/lib/seller/access"
import ProductFormClient from "@/components/seller/ProductFormClient"

export const metadata = { title: "Add Product" }

export default async function NewProductPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const access = await getShopAccess()
  if (!access) redirect("/seller/onboarding")
  if (!canAccess(access, "PRODUCTS")) redirect("/seller/dashboard")

  const [categories, brands] = await Promise.all([getAllCategories(), getAllBrands()])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Add Product</h1>
      <ProductFormClient categories={categories} brands={brands} />
    </div>
  )
}
