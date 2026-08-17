"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { requireShopAccess } from "@/lib/seller/access"
import { createNotification } from "@/lib/notifications/create"
import {
  buildReturnSellerApprovedCopy,
  buildReturnSellerRejectedCopy,
} from "@/lib/notifications/copy"
import { logOrderEvent } from "@/lib/orders/timeline"
import { executeRefund } from "@/lib/payments/refund-core"

export async function reviewReturnRequest(
  returnRequestId: string,
  decision: "APPROVE" | "REJECT",
  note: string
): Promise<{ error?: string }> {
  const shop = await requireShopAccess("ORDERS")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const seller = await getCurrentUser()
  if (!seller) return { error: "Unauthorized" }

  const trimmedNote = note.trim()
  if (decision === "REJECT" && !trimmedNote) return { error: "A reason is required to decline a request" }

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: { order: { select: { id: true, userId: true } } },
  })
  if (!returnRequest || returnRequest.shopId !== shop.id) return { error: "Not found" }
  if (returnRequest.status !== "PENDING_SELLER") {
    return { error: "This request has already been decided or escalated" }
  }
  if (new Date() > returnRequest.sellerReviewDeadline) {
    return { error: "The review window has expired — this request has been escalated to admin." }
  }

  if (decision === "REJECT") {
    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: "ADMIN_REVIEW",
          sellerDecisionNote: trimmedNote,
          sellerDecidedAt: new Date(),
          sellerDecidedByUserId: seller.id,
        },
      })
      await logOrderEvent(tx, {
        orderId: returnRequest.orderId,
        type: "RETURN_SELLER_REJECTED",
        message: `Seller declined the request: ${trimmedNote}`,
        actorId: seller.id,
        actorRole: "SELLER",
      })
      await logOrderEvent(tx, {
        orderId: returnRequest.orderId,
        type: "RETURN_ESCALATED_TO_ADMIN",
        message: "Escalated to platform support for final review.",
      })
    })

    await createNotification({
      userId: returnRequest.order.userId,
      ...buildReturnSellerRejectedCopy(returnRequest.orderId),
    })

    revalidatePath(`/seller/orders/${returnRequest.orderId}`)
    revalidatePath(`/account/orders/${returnRequest.orderId}`)
    return {}
  }

  // APPROVE
  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: "SELLER_APPROVED",
        sellerDecisionNote: trimmedNote || null,
        sellerDecidedAt: new Date(),
        sellerDecidedByUserId: seller.id,
      },
    })
    await logOrderEvent(tx, {
      orderId: returnRequest.orderId,
      type: "RETURN_SELLER_APPROVED",
      message: "Seller approved the return/refund request.",
      actorId: seller.id,
      actorRole: "SELLER",
    })
  })

  await createNotification({
    userId: returnRequest.order.userId,
    ...buildReturnSellerApprovedCopy(returnRequest.orderId),
  })

  const result = await executeRefund({
    orderId: returnRequest.orderId,
    reason: `Return/refund approved by seller: ${returnRequest.reason}`,
    initiatedByUserId: seller.id,
    returnRequestId: returnRequest.id,
  })

  revalidatePath(`/seller/orders/${returnRequest.orderId}`)
  revalidatePath(`/account/orders/${returnRequest.orderId}`)

  if (result.error) return { error: result.error }
  return {}
}
