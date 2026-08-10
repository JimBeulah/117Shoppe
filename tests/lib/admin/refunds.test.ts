import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      update: vi.fn(),
    },
    refund: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}))

vi.mock("@/lib/data/user", () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("@/lib/admin/actions", () => ({
  assertAdmin: vi.fn(),
}))

vi.mock("@/lib/payments/paymongo", () => ({
  createPaymongoRefund: vi.fn(),
}))

vi.mock("@/lib/notifications/create", () => ({
  createNotification: vi.fn(),
}))

const baseOrder = {
  id: "order_1",
  userId: "buyer_1",
  status: "PAID",
  refund: null,
  payment: {
    id: "payment_1",
    status: "PAID",
    provider: "PAYMONGO",
    amount: 500,
    externalPaymentId: "pay_ext_1",
  },
}

describe("issueRefund", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "admin_1", role: "ADMIN" } as any)
  })

  it("refunds a paid PayMongo order and updates DB state", async () => {
    const { prisma } = await import("@/lib/db")
    const { createPaymongoRefund } = await import("@/lib/payments/paymongo")
    const { createNotification } = await import("@/lib/notifications/create")

    vi.mocked(prisma.order.findUnique).mockResolvedValue(baseOrder as any)
    vi.mocked(createPaymongoRefund).mockResolvedValue({ id: "refund_ext_1" } as any)

    const { issueRefund } = await import("@/lib/admin/refunds")
    const result = await issueRefund("order_1", "Item damaged")

    expect(result.error).toBeUndefined()
    expect(createPaymongoRefund).toHaveBeenCalledWith("pay_ext_1", 500, "Item damaged")
    expect(prisma.refund.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentId: "payment_1",
          orderId: "order_1",
          amount: 500,
          status: "SUCCEEDED",
          initiatedByUserId: "admin_1",
          gatewayRefundId: "refund_ext_1",
        }),
      })
    )
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment_1" },
      data: { status: "REFUNDED" },
    })
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { status: "REFUNDED" },
    })
    expect(createNotification).toHaveBeenCalled()
  })

  it("rejects when a reason is not provided", async () => {
    const { issueRefund } = await import("@/lib/admin/refunds")
    const result = await issueRefund("order_1", "   ")
    expect(result.error).toMatch(/reason/i)
  })

  it("rejects orders that are not PAID/CANCELLED", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, status: "SHIPPED" } as any)

    const { issueRefund } = await import("@/lib/admin/refunds")
    const result = await issueRefund("order_1", "reason")
    expect(result.error).toMatch(/not eligible/i)
  })

  it("rejects COD orders", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      payment: { ...baseOrder.payment, provider: "COD" },
    } as any)

    const { issueRefund } = await import("@/lib/admin/refunds")
    const result = await issueRefund("order_1", "reason")
    expect(result.error).toMatch(/online payments/i)
  })

  it("rejects orders that already have a refund", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      refund: { id: "refund_1" },
    } as any)

    const { issueRefund } = await import("@/lib/admin/refunds")
    const result = await issueRefund("order_1", "reason")
    expect(result.error).toMatch(/already been refunded/i)
  })

  it("returns an error when the gateway call fails", async () => {
    const { prisma } = await import("@/lib/db")
    const { createPaymongoRefund } = await import("@/lib/payments/paymongo")

    vi.mocked(prisma.order.findUnique).mockResolvedValue(baseOrder as any)
    vi.mocked(createPaymongoRefund).mockRejectedValue(new Error("gateway down"))

    const { issueRefund } = await import("@/lib/admin/refunds")
    const result = await issueRefund("order_1", "reason")
    expect(result.error).toMatch(/gateway/i)
    expect(prisma.refund.create).not.toHaveBeenCalled()
  })
})
