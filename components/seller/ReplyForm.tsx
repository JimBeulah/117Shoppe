"use client"

import { useState, useTransition } from "react"
import { replyToReview } from "@/lib/seller/actions"

interface ReplyFormProps {
  reviewId: string
}

export function ReplyForm({ reviewId }: ReplyFormProps) {
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!comment.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await replyToReview(reviewId, comment)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write your reply…"
        rows={3}
        className="w-full border border-border-default rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!comment.trim() || isPending}
        className="text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-4 py-1.5 rounded transition-colors"
      >
        {isPending ? "Submitting…" : "Reply"}
      </button>
    </div>
  )
}
