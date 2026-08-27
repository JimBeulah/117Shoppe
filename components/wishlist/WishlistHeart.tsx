"use client"

import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useWishlist } from "@/components/wishlist/WishlistProvider"
import { cn } from "@/lib/utils"

interface WishlistHeartProps {
  productId: string
  variant?: "card" | "pdp"
  className?: string
}

export function WishlistHeart({ productId, variant = "card", className }: WishlistHeartProps) {
  const { isWishlisted, toggle } = useWishlist()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const wishlisted = isWishlisted(productId)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!isSignedIn) {
      router.push("/sign-in")
      return
    }

    toggle(productId)
  }

  if (variant === "pdp") {
    return (
      <button
        onClick={handleClick}
        aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
        aria-pressed={wishlisted}
        className={cn(
          "flex items-center justify-center gap-1.5 py-3 px-4 rounded-lg border transition-colors",
          wishlisted
            ? "border-accent-sale text-accent-sale bg-accent-sale/5"
            : "border-border text-text-secondary hover:border-brand-400 hover:text-brand-600",
          className
        )}
      >
        <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={wishlisted}
      className={cn(
        "w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center hover:scale-110 transition-transform",
        className
      )}
    >
      <Heart
        size={15}
        className={wishlisted ? "text-accent-sale" : "text-text-secondary"}
        fill={wishlisted ? "currentColor" : "none"}
      />
    </button>
  )
}
