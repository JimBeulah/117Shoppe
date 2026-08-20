"use client"

import { useState, useTransition } from "react"
import { StarPicker } from "@/components/reviews/StarPicker"
import { ReviewMediaUploader } from "@/components/reviews/ReviewMediaUploader"
import { submitReview } from "@/lib/actions/reviews"

interface ReviewModalProps {
  productId: string
  productSlug: string
  productName: string
  orderId: string
  onClose: () => void
}

export function ReviewModal({ productId, productSlug, productName, orderId, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (rating === 0) return
    setError(null)
    startTransition(async () => {
      const result = await submitReview({ productId, productSlug, orderId, rating, comment, images, videos })
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Rate this product</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-text-secondary line-clamp-2">{productName}</p>

        <StarPicker value={rating} onChange={setRating} />

        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Share your experience (optional)"
            rows={4}
            className="w-full border border-border-default rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-text-secondary text-right mt-0.5">{comment.length}/500</p>
        </div>

        <ReviewMediaUploader
          images={images}
          videos={videos}
          onImagesChange={setImages}
          onVideosChange={setVideos}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isPending}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded transition-colors text-sm"
        >
          {isPending ? "Submitting…" : "Submit Review"}
        </button>
      </div>
    </div>
  )
}
