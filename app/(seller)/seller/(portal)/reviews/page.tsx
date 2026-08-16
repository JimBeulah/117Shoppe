import { redirect } from "next/navigation"
import { getShopReviews } from "@/lib/seller/queries"
import { getShopAccess, canAccess } from "@/lib/seller/access"
import { ReviewsList } from "@/components/seller/ReviewsList"

export const metadata = { title: "Product Reviews | Seller Centre" }

export default async function SellerReviewsPage() {
  const access = await getShopAccess()
  if (!access) redirect("/seller/onboarding")
  if (!canAccess(access, "REVIEWS")) redirect("/seller/dashboard")
  const shop = access.shop

  const reviews = await getShopReviews(shop.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Product Reviews</h1>
      <ReviewsList reviews={reviews} />
    </div>
  )
}
