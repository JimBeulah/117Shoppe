import crypto from "node:crypto"

export function verifyPaymongoSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  if (!signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const [key, value] = kv.split("=")
      return [key, value]
    })
  )

  const timestamp = parts.t
  const providedSignature = parts.li ?? parts.te
  if (!timestamp || !providedSignature) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex")

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(providedSignature)
  if (expectedBuf.length !== providedBuf.length) return false

  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}
