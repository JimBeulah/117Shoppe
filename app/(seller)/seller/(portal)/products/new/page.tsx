import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getAllCategories } from "@/lib/seller/queries"
import ProductFormClient from "@/components/seller/ProductFormClient"

export const metadata = { title: "Add Product" }

export default async function NewProductPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const categories = await getAllCategories()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Add Product</h1>
      <ProductFormClient categories={categories} />
    </div>
  )
}
