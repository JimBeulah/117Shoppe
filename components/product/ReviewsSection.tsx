import { getProductReviews, getProductRatingStats } from "@/lib/data/reviews"
import { RatingBreakdown } from "./RatingBreakdown"
import { ReviewCard } from "./ReviewCard"

interface ReviewsSectionProps {
  productId: string
  productRating: number
  productReviewCount: number
}

export async function ReviewsSection({ productId, productRating, productReviewCount }: ReviewsSectionProps) {
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
          productRating={productRating}
          productReviewCount={productReviewCount}
        />
      )}
    </div>
  )
}

async function ReviewsContent({ productId, productRating, productReviewCount }: ReviewsSectionProps) {
  const [reviews, ratingCounts] = await Promise.all([
    getProductReviews(productId),
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
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </>
  )
}
