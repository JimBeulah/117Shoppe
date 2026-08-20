import type { ReviewWithUser } from "@/types"
import { HelpfulButton } from "@/components/reviews/HelpfulButton"

interface ReviewCardProps {
  review: ReviewWithUser
  productSlug: string
}

export function ReviewCard({ review, productSlug }: ReviewCardProps) {
  const initial = review.user.name.charAt(0).toUpperCase()
  const firstName = review.user.name.split(" ")[0]

  return (
    <div className="py-4 border-b border-border-default last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{firstName}</span>
            <span className="text-xs text-text-secondary">
              {new Date(review.createdAt).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={s <= review.rating ? "text-reward" : "text-gray-300"}>
                ★
              </span>
            ))}
          </div>
          {review.comment && (
            <p className="text-sm text-text-primary mt-1.5 leading-relaxed">{review.comment}</p>
          )}
          {(review.images.length > 0 || review.videos.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {review.images.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={`Review photo ${i + 1}`}
                  className="w-16 h-16 object-cover rounded border border-border-default"
                />
              ))}
              {review.videos.map((url) => (
                <video
                  key={url}
                  src={url}
                  controls
                  className="w-16 h-16 object-cover rounded border border-border-default"
                />
              ))}
            </div>
          )}
          <HelpfulButton
            reviewId={review.id}
            productSlug={productSlug}
            helpfulCount={review.helpfulCount}
            hasVoted={review.hasVoted}
          />
          {review.reply && (
            <div className="mt-3 ml-2 pl-3 border-l-2 border-border-default bg-bg-page rounded-r px-3 py-2">
              <p className="text-xs font-medium text-text-secondary mb-1">Shop&apos;s response:</p>
              <p className="text-sm text-text-primary">{review.reply.comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
