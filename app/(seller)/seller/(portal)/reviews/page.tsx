import { redirect } from "next/navigation"
import { getShopReviews } from "@/lib/seller/queries"
import { getShopAccess, canAccess } from "@/lib/seller/access"
import { ReviewsList } from "@/components/seller/ReviewsList"
import { Pagination } from "@/components/catalog/Pagination"

export const metadata = { title: "Product Reviews | Seller Centre" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function SellerReviewsPage({ searchParams }: Props) {
  const access = await getShopAccess()
  if (!access) redirect("/seller/onboarding")
  if (!canAccess(access, "REVIEWS")) redirect("/seller/dashboard")
  const shop = access.shop

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1) || 1)

  const { reviews, total, pageSize } = await getShopReviews(shop.id, page)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Product Reviews</h1>
      <ReviewsList reviews={reviews} />
      <Pagination total={total} pageSize={pageSize} currentPage={page} />
    </div>
  )
}
