import { describe, it, expect, vi, beforeEach } from "vitest"
import crypto from "node:crypto"

vi.mock("@/lib/db", () => ({
  prisma: {
    payment: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    order: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}))

vi.mock("@/lib/notifications/create", () => ({
  createNotification: vi.fn(),
}))

let signatureHeaderValue = ""
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["paymongo-signature", signatureHeaderValue]])),
}))

function sign(secret: string, timestamp: string, body: string) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
}

const SECRET = "whsec_test"

function buildPayload() {
  return JSON.stringify({
    data: {
      attributes: {
        type: "link.payment.paid",
        data: {
          id: "link_1",
          attributes: { payments: [{ id: "pay_ext_1" }] },
        },
      },
    },
  })
}

describe("POST /api/webhooks/paymongo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PAYMONGO_WEBHOOK_SECRET = SECRET
    signatureHeaderValue = ""
  })

  it("marks all sibling orders PAID on link.payment.paid", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      { id: "payment_1", orderId: "order_1", status: "PENDING" },
      { id: "payment_2", orderId: "order_2", status: "PENDING" },
    ] as any)
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ userId: "buyer_1" } as any)

    const body = buildPayload()
    const timestamp = "1234567890"
    const signature = sign(SECRET, timestamp, body)
    signatureHeaderValue = `t=${timestamp},li=${signature}`

    const { POST } = await import("@/app/api/webhooks/paymongo/route")
    const req = new Request("http://localhost/api/webhooks/paymongo", { method: "POST", body })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prisma.payment.update).toHaveBeenCalledTimes(2)
    expect(prisma.order.update).toHaveBeenCalledTimes(2)
  })

  it("returns 400 for an invalid signature", async () => {
    const body = buildPayload()
    signatureHeaderValue = "t=123,li=deadbeef"
    const { POST } = await import("@/app/api/webhooks/paymongo/route")
    const req = new Request("http://localhost/api/webhooks/paymongo", { method: "POST", body })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 500 when the webhook secret is not configured", async () => {
    delete process.env.PAYMONGO_WEBHOOK_SECRET
    const { POST } = await import("@/app/api/webhooks/paymongo/route")
    const req = new Request("http://localhost/api/webhooks/paymongo", { method: "POST", body: "{}" })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
