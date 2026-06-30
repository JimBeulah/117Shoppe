import Image from "next/image"
import { ReplyForm } from "./ReplyForm"
import type { ShopReviewWithProduct } from "@/types"

interface ReviewsListProps {
  reviews: ShopReviewWithProduct[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return <p className="text-sm text-text-secondary">No reviews yet.</p>
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const image = review.product.images[0]
        return (
          <div key={review.id} className="bg-white border border-border-default rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border-default">
              {image && (
                <div className="relative w-10 h-10 flex-shrink-0">
                  <Image src={image} alt={review.product.name} fill className="object-cover rounded" />
                </div>
              )}
              <p className="text-sm font-medium text-text-primary line-clamp-1">
                {review.product.name}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  {review.user.name.split(" ")[0]}
                </span>
                <span className="text-xs text-text-secondary">
                  {new Date(review.createdAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={s <= review.rating ? "text-reward" : "text-gray-300"}>
                    ★
                  </span>
                ))}
              </div>
              {review.comment && (
                <p className="text-sm text-text-primary mt-1">{review.comment}</p>
              )}
            </div>

            {review.reply ? (
              <div className="mt-3 ml-2 pl-3 border-l-2 border-border-default bg-bg-page rounded-r px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-text-secondary">Shop's response</span>
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-medium">
                    Replied
                  </span>
                </div>
                <p className="text-sm text-text-primary">{review.reply.comment}</p>
              </div>
            ) : (
              <ReplyForm reviewId={review.id} />
            )}
          </div>
        )
      })}
    </div>
  )
}
