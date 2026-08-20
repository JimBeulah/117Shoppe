"use client"

import { useState, useTransition } from "react"
import { voteReviewHelpful } from "@/lib/actions/reviews"

interface HelpfulButtonProps {
  reviewId: string
  productSlug: string
  helpfulCount: number
  hasVoted: boolean
}

export function HelpfulButton({ reviewId, productSlug, helpfulCount, hasVoted }: HelpfulButtonProps) {
  const [count, setCount] = useState(helpfulCount)
  const [voted, setVoted] = useState(hasVoted)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const nextVoted = !voted
    setVoted(nextVoted)
    setCount((c) => c + (nextVoted ? 1 : -1))
    startTransition(async () => {
      const result = await voteReviewHelpful(reviewId, productSlug)
      if (result.error || result.voted === undefined) {
        setVoted(!nextVoted)
        setCount((c) => c + (nextVoted ? -1 : 1))
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`mt-2 text-xs font-medium flex items-center gap-1 ${
        voted ? "text-brand-600" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      <span>👍</span>
      <span>Helpful{count > 0 ? ` (${count})` : ""}</span>
    </button>
  )
}
