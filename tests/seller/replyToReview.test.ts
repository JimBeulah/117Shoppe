import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/data/user", () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    shop: { findUnique: vi.fn() },
    review: { findFirst: vi.fn() },
    reviewReply: { create: vi.fn() },
  },
}))

vi.mock("@/lib/notifications/create", () => ({
  createNotification: vi.fn(),
}))

describe("replyToReview", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when not a verified seller", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "Thanks!")

    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns error for empty comment", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "SELLER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: "shop-1" } as any)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "   ")

    expect(result).toEqual({ error: "Reply cannot be empty" })
  })

  it("returns error when review not found in this shop", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "SELLER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: "shop-1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue(null)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "Thank you!")

    expect(result).toEqual({ error: "Review not found" })
  })

  it("returns error when already replied", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "SELLER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: "shop-1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue({
      id: "rev-1",
      userId: "buyer-1",
      reply: { id: "reply-1" },
      product: { name: "Widget", slug: "widget" },
    } as any)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "Thank you!")

    expect(result).toEqual({ error: "Already replied to this review" })
  })

  it("creates reply on success", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "SELLER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: "shop-1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue({
      id: "rev-1",
      userId: "buyer-1",
      reply: null,
      product: { name: "Widget", slug: "widget" },
    } as any)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "Thank you for your feedback!")

    expect(result).toEqual({})
    expect(prisma.reviewReply.create).toHaveBeenCalledWith({
      data: { reviewId: "rev-1", shopId: "shop-1", comment: "Thank you for your feedback!" },
    })
  })
})
