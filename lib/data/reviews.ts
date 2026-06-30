import { cache } from "react"
import { prisma } from "@/lib/db"
import type { ReviewWithUser } from "@/types"

const PAGE_SIZE = 10

export const getProductReviews = cache(async (productId: string, page = 1): Promise<ReviewWithUser[]> => {
  return prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
      reply: { select: { comment: true } },
    },
  })
})

export const getUserReviewedProductIds = cache(async (userId: string): Promise<Set<string>> => {
  const reviews = await prisma.review.findMany({
    where: { userId },
    select: { productId: true },
  })
  return new Set(reviews.map((r) => r.productId))
})

export const getProductRatingStats = cache(async (productId: string): Promise<Record<number, number>> => {
  const groups = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId },
    _count: { _all: true },
  })
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const g of groups) {
    counts[g.rating] = g._count._all
  }
  return counts
})
