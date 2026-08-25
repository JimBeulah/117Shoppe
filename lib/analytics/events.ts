import { prisma } from "@/lib/db"
import type { AnalyticsEventType, Prisma } from "@/lib/generated/prisma/client"

type TxClient = Prisma.TransactionClient | typeof prisma

export async function logAnalyticsEvent(
  tx: TxClient,
  data: {
    type: AnalyticsEventType
    productId?: string | null
    shopId?: string | null
    userId?: string | null
    sessionId?: string | null
    orderId?: string | null
    quantity?: number | null
  }
) {
  return tx.analyticsEvent.create({
    data: {
      type: data.type,
      productId: data.productId ?? null,
      shopId: data.shopId ?? null,
      userId: data.userId ?? null,
      sessionId: data.sessionId ?? null,
      orderId: data.orderId ?? null,
      quantity: data.quantity ?? null,
    },
  })
}
