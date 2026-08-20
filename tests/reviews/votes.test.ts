import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    reviewVote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    review: {
      update: vi.fn(),
    },
    $transaction: vi.fn(async (ops: any[]) => Promise.all(ops)),
  },
}))

describe("hasVotedHelpful", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns true when a vote row exists", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.reviewVote.findUnique).mockResolvedValue({ id: "v1" } as any)

    const { hasVotedHelpful } = await import("@/lib/reviews/votes")
    await expect(hasVotedHelpful("u1", "r1")).resolves.toBe(true)
  })

  it("returns false when no vote row exists", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.reviewVote.findUnique).mockResolvedValue(null)

    const { hasVotedHelpful } = await import("@/lib/reviews/votes")
    await expect(hasVotedHelpful("u1", "r1")).resolves.toBe(false)
  })
})

describe("toggleHelpfulVote", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a vote and increments helpfulCount when none exists", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.reviewVote.findUnique).mockResolvedValue(null)

    const { toggleHelpfulVote } = await import("@/lib/reviews/votes")
    const result = await toggleHelpfulVote("u1", "r1")

    expect(result).toEqual({ voted: true })
    expect(prisma.reviewVote.create).toHaveBeenCalledWith({ data: { userId: "u1", reviewId: "r1" } })
    expect(prisma.review.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { helpfulCount: { increment: 1 } },
    })
  })

  it("deletes the vote and decrements helpfulCount when one already exists", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.reviewVote.findUnique).mockResolvedValue({ id: "v1" } as any)

    const { toggleHelpfulVote } = await import("@/lib/reviews/votes")
    const result = await toggleHelpfulVote("u1", "r1")

    expect(result).toEqual({ voted: false })
    expect(prisma.reviewVote.delete).toHaveBeenCalledWith({ where: { id: "v1" } })
    expect(prisma.review.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { helpfulCount: { decrement: 1 } },
    })
  })
})
