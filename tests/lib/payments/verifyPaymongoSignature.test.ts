import { describe, it, expect } from "vitest"
import crypto from "node:crypto"
import { verifyPaymongoSignature } from "@/lib/payments/verifyPaymongoSignature"

function sign(secret: string, timestamp: string, body: string) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
}

describe("verifyPaymongoSignature", () => {
  const secret = "whsec_test"
  const body = JSON.stringify({ data: { id: "evt_1" } })

  it("accepts a valid live signature", () => {
    const timestamp = "1234567890"
    const sig = sign(secret, timestamp, body)
    const header = `t=${timestamp},li=${sig}`
    expect(verifyPaymongoSignature(body, header, secret)).toBe(true)
  })

  it("accepts a valid test-mode signature", () => {
    const timestamp = "1234567890"
    const sig = sign(secret, timestamp, body)
    const header = `t=${timestamp},te=${sig}`
    expect(verifyPaymongoSignature(body, header, secret)).toBe(true)
  })

  it("rejects a tampered body", () => {
    const timestamp = "1234567890"
    const sig = sign(secret, timestamp, body)
    const header = `t=${timestamp},li=${sig}`
    expect(verifyPaymongoSignature(body + "tampered", header, secret)).toBe(false)
  })

  it("rejects a missing signature header", () => {
    expect(verifyPaymongoSignature(body, "", secret)).toBe(false)
  })

  it("rejects a header missing the timestamp or signature parts", () => {
    expect(verifyPaymongoSignature(body, "li=abc", secret)).toBe(false)
    expect(verifyPaymongoSignature(body, "t=1234567890", secret)).toBe(false)
  })
})
