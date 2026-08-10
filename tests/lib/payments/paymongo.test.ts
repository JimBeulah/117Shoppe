import { describe, it, expect, vi, beforeEach } from "vitest"

describe("paymongo API wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.PAYMONGO_SECRET_KEY = "sk_test_abc"
    global.fetch = vi.fn()
  })

  it("createPaymongoLink sends amount in centavos with Basic auth", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "link_1", attributes: { checkout_url: "https://pm.link/1" } } }),
    } as Response)

    const { createPaymongoLink } = await import("@/lib/payments/paymongo")
    const result = await createPaymongoLink(199.5, "Order #1")

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.paymongo.com/v1/links",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("sk_test_abc:").toString("base64")}`,
        }),
      })
    )
    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string)
    expect(body.data.attributes.amount).toBe(19950)
    expect(result.id).toBe("link_1")
  })

  it("throws when the API responds with a non-2xx status", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "bad request",
    } as Response)

    const { createPaymongoLink } = await import("@/lib/payments/paymongo")
    await expect(createPaymongoLink(100, "Order #2")).rejects.toThrow(/PayMongo request failed/)
  })

  it("throws when PAYMONGO_SECRET_KEY is not set", async () => {
    delete process.env.PAYMONGO_SECRET_KEY
    const { createPaymongoLink } = await import("@/lib/payments/paymongo")
    await expect(createPaymongoLink(100, "Order #3")).rejects.toThrow(/PAYMONGO_SECRET_KEY/)
  })

  it("createPaymongoRefund maps unknown reasons to 'others'", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "refund_1", attributes: { status: "succeeded" } } }),
    } as Response)

    const { createPaymongoRefund } = await import("@/lib/payments/paymongo")
    await createPaymongoRefund("pay_1", 50, "buyer changed their mind")

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string)
    expect(body.data.attributes.reason).toBe("others")
    expect(body.data.attributes.payment_id).toBe("pay_1")
    expect(body.data.attributes.amount).toBe(5000)
  })
})
