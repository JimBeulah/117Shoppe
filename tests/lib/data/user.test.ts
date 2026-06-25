import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}))

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when not signed in", async () => {
    const { auth } = await import("@clerk/nextjs/server")
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const { getCurrentUser } = await import("@/lib/data/user")
    const result = await getCurrentUser()
    expect(result).toBeNull()
  })

  it("fetches Prisma user by clerkId when signed in", async () => {
    const { auth } = await import("@clerk/nextjs/server")
    const { prisma } = await import("@/lib/db")
    const mockUser = { id: "1", clerkId: "clerk_abc", name: "Juan", email: "juan@test.com", role: "BUYER" }

    vi.mocked(auth).mockResolvedValue({ userId: "clerk_abc" } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const { getCurrentUser } = await import("@/lib/data/user")
    const result = await getCurrentUser()

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { clerkId: "clerk_abc" } })
    expect(result).toEqual(mockUser)
  })
})
