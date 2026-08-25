"use client"

import { useEffect, useTransition } from "react"
import { logProductView } from "@/lib/analytics/actions"

interface Props {
  productId: string
  shopId: string
}

export function ProductViewTracker({ productId, shopId }: Props) {
  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      logProductView(productId, shopId)
    })
  }, [productId, shopId])

  return null
}
