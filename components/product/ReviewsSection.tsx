import { getProductReviews, getProductRatingStats } from "@/lib/data/reviews"
import { getCurrentUser } from "@/lib/data/user"
import { RatingBreakdown } from "./RatingBreakdown"
import { ReviewCard } from "./ReviewCard"

interface ReviewsSectionProps {
  productId: string
  productSlug: string
  productRating: number
  productReviewCount: number
}

export async function ReviewsSection({
  productId,
  productSlug,
  productRating,
  productReviewCount,
}: ReviewsSectionProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text-primary mb-4">Product Ratings &amp; Reviews</h2>
      {productReviewCount === 0 ? (
        <p className="text-sm text-text-secondary">
          No reviews yet. Be the first to review this product.
        </p>
      ) : (
        <ReviewsContent
          productId={productId}
          productSlug={productSlug}
          productRating={productRating}
          productReviewCount={productReviewCount}
        />
      )}
    </div>
  )
}

async function ReviewsContent({ productId, productSlug, productRating, productReviewCount }: ReviewsSectionProps) {
  const user = await getCurrentUser()
  const [reviews, ratingCounts] = await Promise.all([
    getProductReviews(productId, 1, user?.id),
    getProductRatingStats(productId),
  ])

  return (
    <>
      <RatingBreakdown
        overallRating={productRating}
        totalCount={productReviewCount}
        ratingCounts={ratingCounts}
      />
      <div className="mt-5">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} productSlug={productSlug} />
        ))}
      </div>
    </>
  )
}
