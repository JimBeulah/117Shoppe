"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toggleFollow } from "@/app/(shop)/shop/[slug]/actions"

interface Props {
  shopId: string
  shopSlug: string
  initialFollowing: boolean
  initialCount: number
  isSignedIn: boolean
}

export function FollowButton({ shopId, shopSlug, initialFollowing, initialCount, isSignedIn }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!isSignedIn) {
      router.push("/sign-in")
      return
    }

    const nextFollowing = !following
    setFollowing(nextFollowing)
    setCount((c) => (nextFollowing ? c + 1 : c - 1))

    startTransition(async () => {
      try {
        const result = await toggleFollow(shopId, shopSlug)
        setFollowing(result.following)
        setCount(result.followerCount)
      } catch {
        // Revert optimistic update on error
        setFollowing(following)
        setCount(count)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary">{count.toLocaleString()} followers</span>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={
          following
            ? "px-4 py-1.5 rounded text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
            : "px-4 py-1.5 rounded text-sm font-medium border border-brand-600 text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-60"
        }
      >
        {isPending ? "..." : following ? "Following" : "Follow"}
      </button>
    </div>
  )
}
