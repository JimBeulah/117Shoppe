import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const prisma = {
    review: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  }
  return { prisma }
})

describe("getProductReviews", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns reviews ordered by createdAt desc, page 1", async () => {
    const { prisma } = await import("@/lib/db")
    const mockReviews = [
      { id: "r1", rating: 5, comment: "Great!", createdAt: new Date(), user: { name: "Alice" }, reply: null },
    ]
    vi.mocked(prisma.review.findMany).mockResolvedValue(mockReviews as any)

    const { getProductReviews } = await import("@/lib/data/reviews")
    const result = await getProductReviews("prod-1")

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "prod-1" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      })
    )
    expect(result).toEqual(mockReviews)
  })

  it("skips correctly for page 2", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.review.findMany).mockResolvedValue([])

    const { getProductReviews } = await import("@/lib/data/reviews")
    await getProductReviews("prod-1", 2)

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10 })
    )
  })
})

describe("getProductRatingStats", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns counts keyed by star rating with zeroes for missing stars", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.review.groupBy).mockResolvedValue([
      { rating: 5, _count: { _all: 8 } },
      { rating: 4, _count: { _all: 2 } },
    ] as any)

    const { getProductRatingStats } = await import("@/lib/data/reviews")
    const result = await getProductRatingStats("prod-1")

    expect(result).toEqual({ 1: 0, 2: 0, 3: 0, 4: 2, 5: 8 })
  })
})
