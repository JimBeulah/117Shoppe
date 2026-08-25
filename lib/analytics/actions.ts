"use server"

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { getOrCreateAnonSessionId } from "@/lib/analytics/session"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export async function logProductView(productId: string, shopId: string): Promise<void> {
  try {
    const user = await getCurrentUser()
    const sessionId = await getOrCreateAnonSessionId()
    await logAnalyticsEvent(prisma, {
      type: "PRODUCT_VIEW",
      productId,
      shopId,
      userId: user?.id ?? null,
      sessionId,
    })
  } catch {
    // Analytics must never break page rendering.
  }
}
