import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      create: vi.fn().mockResolvedValue({ id: "user_1", clerkId: "clerk_abc" }),
    },
  },
}))

// Mock clerkClient
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(() => ({
    users: {
      updateUserMetadata: vi.fn().mockResolvedValue({}),
    },
  })),
  Webhook: vi.fn(),
}))

// Mock svix Webhook
vi.mock("svix", () => ({
  Webhook: vi.fn().mockImplementation(function () {
    return {
      verify: vi.fn().mockReturnValue({
        type: "user.created",
        data: {
          id: "clerk_abc",
          email_addresses: [{ email_address: "test@example.com" }],
          first_name: "Juan",
          last_name: "dela Cruz",
          image_url: "https://img.clerk.com/avatar.jpg",
        },
      }),
    }
  }),
}))

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ["svix-id", "msg_abc"],
      ["svix-timestamp", "1234567890"],
      ["svix-signature", "v1,abc123"],
    ])
  ),
}))

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CLERK_WEBHOOK_SECRET = "whsec_test"
  })

  it("creates a Prisma user on user.created event", async () => {
    const { POST } = await import("@/app/api/webhooks/clerk/route")
    const { prisma } = await import("@/lib/db")

    const req = new Request("http://localhost/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "svix-id": "msg_abc",
        "svix-timestamp": "1234567890",
        "svix-signature": "v1,abc123",
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        clerkId: "clerk_abc",
        email: "test@example.com",
        name: "Juan dela Cruz",
        avatar: "https://img.clerk.com/avatar.jpg",
        role: "BUYER",
      },
    })
  })

  it("returns 400 for invalid svix signature", async () => {
    const { Webhook } = await import("svix")
    vi.mocked(Webhook).mockImplementationOnce(function () {
      return {
        verify: vi.fn().mockImplementation(() => {
          throw new Error("Invalid signature")
        }),
      }
    } as any)

    const { POST } = await import("@/app/api/webhooks/clerk/route")

    const req = new Request("http://localhost/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
