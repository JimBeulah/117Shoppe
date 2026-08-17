import { prisma } from "@/lib/db"
import type { Prisma, OrderEventType, Role } from "@/lib/generated/prisma/client"

type TxClient = Prisma.TransactionClient | typeof prisma

export async function logOrderEvent(
  tx: TxClient,
  params: {
    orderId: string
    type: OrderEventType
    message: string
    actorId?: string | null
    actorRole?: Role | null
    metadata?: Record<string, unknown>
  }
) {
  return tx.orderTimelineEvent.create({
    data: {
      orderId: params.orderId,
      type: params.type,
      message: params.message,
      actorId: params.actorId ?? null,
      actorRole: params.actorRole ?? null,
      metadata: params.metadata as Prisma.InputJsonValue,
    },
  })
}

export async function escalateExpiredReturnRequests() {
  const expired = await prisma.returnRequest.findMany({
    where: { status: "PENDING_SELLER", sellerReviewDeadline: { lt: new Date() } },
    select: { id: true, orderId: true },
  })
  if (expired.length === 0) return

  await prisma.$transaction(async (tx) => {
    for (const request of expired) {
      await tx.returnRequest.update({
        where: { id: request.id },
        data: { status: "ADMIN_REVIEW" },
      })
      await logOrderEvent(tx, {
        orderId: request.orderId,
        type: "RETURN_ESCALATED_TO_ADMIN",
        message: "Seller did not respond in time — escalated to platform support for review.",
      })
    }
  })
}
