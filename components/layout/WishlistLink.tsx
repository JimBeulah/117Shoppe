"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import { useWishlist } from "@/components/wishlist/WishlistProvider"

export function WishlistLink() {
  const { count } = useWishlist()

  return (
    <Link
      href="/account/wishlist"
      aria-label="Wishlist"
      className="relative hover:text-brand-100 hover:scale-110 transition-all duration-200"
    >
      <Heart size={22} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-accent-sale text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
