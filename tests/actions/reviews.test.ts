import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/data/user", () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const mockTx = {
  review: {
    create: vi.fn(),
    aggregate: vi.fn().mockResolvedValue({ _avg: { rating: 4.5 } }),
    count: vi.fn().mockResolvedValue(2),
  },
  product: { update: vi.fn() },
}

vi.mock("@/lib/db", () => ({
  prisma: {
    orderItem: { findFirst: vi.fn() },
    review: { findFirst: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn(mockTx)),
  },
}))

describe("submitReview", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when not authenticated", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "p-slug", orderId: "o1", rating: 5, comment: "" })

    expect(result).toEqual({ error: "Sign in to leave a review" })
  })

  it("returns error for invalid rating", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "BUYER" } as any)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "p-slug", orderId: "o1", rating: 0, comment: "" })

    expect(result).toEqual({ error: "Rating must be 1–5" })
  })

  it("returns error when no qualifying delivered order found", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "BUYER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(null)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "p-slug", orderId: "o1", rating: 4, comment: "" })

    expect(result).toEqual({ error: "You can only review products from delivered orders" })
  })

  it("returns error when review already exists", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "BUYER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: "oi1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue({ id: "r1" } as any)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "p-slug", orderId: "o1", rating: 4, comment: "" })

    expect(result).toEqual({ error: "You have already reviewed this product" })
  })

  it("creates review and updates product rating on success", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "BUYER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: "oi1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue(null)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "prod-slug", orderId: "o1", rating: 5, comment: "Great!" })

    expect(result).toEqual({})
    expect(mockTx.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", productId: "p1", rating: 5, comment: "Great!" }),
      })
    )
    expect(mockTx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: { rating: 4.5, reviewCount: 2 },
      })
    )
  })
})
