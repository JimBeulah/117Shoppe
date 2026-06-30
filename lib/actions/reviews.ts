"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"

export async function submitReview(data: {
  productId: string
  productSlug: string
  orderId: string
  rating: number
  comment: string
}): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to leave a review" }

  const { productId, productSlug, orderId, rating, comment } = data

  if (rating < 1 || rating > 5) return { error: "Rating must be 1–5" }

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      orderId,
      productId,
      order: { userId: user.id, status: "DELIVERED" },
    },
  })
  if (!orderItem) return { error: "You can only review products from delivered orders" }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findFirst({
        where: { userId: user.id, productId },
      })
      if (existing) throw Object.assign(new Error("You have already reviewed this product"), { code: "DUPLICATE" })

      await tx.review.create({
        data: {
          userId: user.id,
          productId,
          orderId,
          rating,
          comment: comment.trim() || null,
          images: [],
        },
      })

      const [avgResult, count] = await Promise.all([
        tx.review.aggregate({ where: { productId }, _avg: { rating: true } }),
        tx.review.count({ where: { productId } }),
      ])

      await tx.product.update({
        where: { id: productId },
        data: {
          rating: avgResult._avg.rating ?? 0,
          reviewCount: count,
        },
      })
    })
  } catch (e: any) {
    if (e?.code === "DUPLICATE") return { error: e.message }
    throw e
  }

  revalidatePath(`/product/${productSlug}`)
  revalidatePath("/account/orders")

  return {}
}
