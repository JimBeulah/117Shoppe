import { prisma } from "@/lib/db"

export async function hasVotedHelpful(userId: string, reviewId: string): Promise<boolean> {
  const vote = await prisma.reviewVote.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  })
  return !!vote
}

export async function toggleHelpfulVote(userId: string, reviewId: string): Promise<{ voted: boolean }> {
  const existing = await prisma.reviewVote.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.reviewVote.delete({ where: { id: existing.id } }),
      prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { decrement: 1 } },
      }),
    ])
    return { voted: false }
  }

  await prisma.$transaction([
    prisma.reviewVote.create({ data: { userId, reviewId } }),
    prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    }),
  ])
  return { voted: true }
}
