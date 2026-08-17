"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { createNotification } from "@/lib/notifications/create"
import { buildReturnRequestedCopy, buildReturnCancelledCopy } from "@/lib/notifications/copy"
import { logOrderEvent } from "@/lib/orders/timeline"
import { canRequestReturn } from "@/lib/orders/eligibility"
import { SELLER_RETURN_REVIEW_HOURS } from "@/lib/orders/config"
import type { ReturnRequestType, ReturnRequestReason } from "@/lib/generated/prisma/client"

const VALID_TYPES: ReturnRequestType[] = ["REFUND_ONLY", "RETURN_AND_REFUND"]
const VALID_REASONS: ReturnRequestReason[] = [
  "ITEM_NOT_RECEIVED",
  "ITEM_DEFECTIVE",
  "WRONG_ITEM_SENT",
  "MISSING_PARTS",
  "NOT_AS_DESCRIBED",
  "CHANGED_MIND",
  "OTHER",
]

export async function requestReturn(input: {
  orderId: string
  type: ReturnRequestType
  reason: ReturnRequestReason
  description: string
  evidenceUrls: string[]
}): Promise<{ error?: string; id?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  if (!VALID_TYPES.includes(input.type)) return { error: "Invalid request type" }
  if (!VALID_REASONS.includes(input.reason)) return { error: "Invalid reason" }
  const description = input.description.trim()
  if (!description) return { error: "Please describe the issue" }
  if (input.evidenceUrls.length > 5) return { error: "You can attach up to 5 photos" }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      shop: { select: { id: true, ownerId: true } },
      returnRequest: { select: { id: true } },
      timelineEvents: { where: { type: "ORDER_DELIVERED" }, select: { type: true, createdAt: true } },
    },
  })
  if (!order || order.userId !== user.id) return { error: "Not found" }
  if (!canRequestReturn(order)) {
    return { error: "This order is not eligible for a return/refund request" }
  }

  const sellerReviewDeadline = new Date(Date.now() + SELLER_RETURN_REVIEW_HOURS * 60 * 60 * 1000)

  const created = await prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.create({
      data: {
        orderId: order.id,
        buyerId: user.id,
        shopId: order.shop.id,
        type: input.type,
        reason: input.reason,
        description,
        evidenceUrls: input.evidenceUrls,
        sellerReviewDeadline,
      },
    })
    await logOrderEvent(tx, {
      orderId: order.id,
      type: "RETURN_REQUESTED",
      message: "Buyer requested a return/refund.",
      actorId: user.id,
      actorRole: "BUYER",
    })
    return returnRequest
  })

  await createNotification({
    userId: order.shop.ownerId,
    ...buildReturnRequestedCopy(order.id, user.name),
  })

  revalidatePath(`/account/orders/${order.id}`)
  revalidatePath(`/seller/orders/${order.id}`)
  return { id: created.id }
}

export async function cancelReturnRequest(orderId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { returnRequest: true, shop: { select: { ownerId: true } } },
  })
  if (!order || order.userId !== user.id) return { error: "Not found" }
  if (!order.returnRequest) return { error: "No return/refund request found" }
  if (order.returnRequest.status !== "PENDING_SELLER") {
    return { error: "This request can no longer be withdrawn" }
  }

  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.update({
      where: { id: order.returnRequest!.id },
      data: { status: "CANCELLED", resolvedAt: new Date() },
    })
    await logOrderEvent(tx, {
      orderId,
      type: "RETURN_CANCELLED_BY_BUYER",
      message: "Buyer withdrew the return/refund request.",
      actorId: user.id,
      actorRole: "BUYER",
    })
  })

  await createNotification({
    userId: order.shop.ownerId,
    ...buildReturnCancelledCopy(orderId, user.name),
  })

  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath(`/seller/orders/${orderId}`)
  return {}
}
