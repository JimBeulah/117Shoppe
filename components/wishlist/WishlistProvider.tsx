"use client"

import { createContext, useContext, useEffect, useState, useTransition, useCallback } from "react"
import { toast } from "sonner"
import { toggleWishlist } from "@/app/(shop)/account/wishlist/actions"

interface WishlistContextValue {
  ids: Set<string>
  count: number
  isWishlisted: (productId: string) => boolean
  toggle: (productId: string) => void
  removeLocal: (productId: string) => void
  isPending: boolean
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    fetch("/api/wishlist/ids")
      .then((res) => res.json())
      .then((data: { ids: string[] }) => {
        if (!cancelled) setIds(new Set(data.ids))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = useCallback((productId: string) => {
    const wasWishlisted = ids.has(productId)
    setIds((prev) => {
      const next = new Set(prev)
      if (wasWishlisted) next.delete(productId)
      else next.add(productId)
      return next
    })

    startTransition(async () => {
      const result = await toggleWishlist(productId)
      if (result.error) {
        toast.error(result.error)
        setIds((prev) => {
          const next = new Set(prev)
          if (wasWishlisted) next.add(productId)
          else next.delete(productId)
          return next
        })
      }
    })
  }, [ids])

  const isWishlisted = useCallback((productId: string) => ids.has(productId), [ids])

  // Used by the /account/wishlist page after removeFromWishlist/moveToCart, which
  // mutate the wishlist outside of `toggle`, so the header badge stays in sync.
  const removeLocal = useCallback((productId: string) => {
    setIds((prev) => {
      const next = new Set(prev)
      next.delete(productId)
      return next
    })
  }, [])

  return (
    <WishlistContext.Provider value={{ ids, count: ids.size, isWishlisted, toggle, removeLocal, isPending }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider")
  return ctx
}
