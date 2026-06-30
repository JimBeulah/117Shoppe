import { redirect } from "next/navigation"
import { getCurrentShop, getShopReviews } from "@/lib/seller/queries"
import { ReviewsList } from "@/components/seller/ReviewsList"

export const metadata = { title: "Product Reviews | Seller Centre" }

export default async function SellerReviewsPage() {
  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const reviews = await getShopReviews(shop.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Product Reviews</h1>
      <ReviewsList reviews={reviews} />
    </div>
  )
}
