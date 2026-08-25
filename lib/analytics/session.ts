import { cookies } from "next/headers"
import { randomUUID } from "crypto"

const SESSION_COOKIE = "sid"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function getOrCreateAnonSessionId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(SESSION_COOKIE)?.value
  if (existing) return existing

  const sessionId = randomUUID()
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  })
  return sessionId
}
