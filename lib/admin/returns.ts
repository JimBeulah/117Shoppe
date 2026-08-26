"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { assertAdmin } from "@/lib/admin/actions"
import { writeAuditLog } from "@/lib/admin/audit"
import { createNotification } from "@/lib/notifications/create"
import { buildReturnAdminApprovedCopy, buildReturnAdminRejectedCopy } from "@/lib/notifications/copy"
import { logOrderEvent, escalateExpiredReturnRequests } from "@/lib/orders/timeline"
import { executeRefund } from "@/lib/payments/refund-core"
import type { ReturnRequestStatus, Prisma } from "@/lib/generated/prisma/client"

const PAGE_SIZE = 20
const VALID_STATUSES: ReturnRequestStatus[] = [
  "PENDING_SELLER",
  "SELLER_APPROVED",
  "SELLER_REJECTED",
  "ADMIN_REVIEW",
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "CANCELLED",
  "COMPLETED",
]

export async function getAdminReturnRequestList(page: number, statusFilter?: string | null) {
  await assertAdmin()

  const where: Prisma.ReturnRequestWhereInput =
    statusFilter && VALID_STATUSES.includes(statusFilter as ReturnRequestStatus)
      ? { status: statusFilter as ReturnRequestStatus }
      : {}

  const [requests, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        order: { select: { id: true, total: true } },
        buyer: { select: { name: true } },
        shop: { select: { name: true } },
      },
    }),
    prisma.returnRequest.count({ where }),
  ])

  return { requests, total, pageSize: PAGE_SIZE }
}

export async function getAdminReturnRequestDetail(id: string) {
  await assertAdmin()

  const target = await prisma.returnRequest.findUnique({ where: { id }, select: { orderId: true } })
  if (target) await escalateExpiredReturnRequests(target.orderId)

  return prisma.returnRequest.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          user: { select: { name: true, email: true } },
          shop: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true, images: true } },
              variant: { select: { name: true } },
            },
          },
          payment: true,
          refund: true,
          timelineEvents: { orderBy: { createdAt: "asc" } },
        },
      },
      buyer: { select: { name: true, email: true } },
      sellerDecidedBy: { select: { name: true } },
      adminDecidedBy: { select: { name: true } },
    },
  })
}

export async function mediateReturnRequest(
  returnRequestId: string,
  decision: "APPROVE" | "REJECT",
  note: string
): Promise<{ error?: string }> {
  const admin = await assertAdmin()

  const trimmedNote = note.trim()
  if (!trimmedNote) return { error: "A note is required" }

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: { order: { select: { id: true, userId: true } } },
  })
  if (!returnRequest) return { error: "Not found" }
  if (returnRequest.status !== "ADMIN_REVIEW") {
    return { error: "This request is not awaiting admin review" }
  }

  if (decision === "REJECT") {
    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: "ADMIN_REJECTED",
          adminDecisionNote: trimmedNote,
          adminDecidedAt: new Date(),
          adminDecidedByUserId: admin.id,
          resolvedAt: new Date(),
        },
      })
      await logOrderEvent(tx, {
        orderId: returnRequest.orderId,
        type: "RETURN_ADMIN_REJECTED",
        message: `Admin denied the request: ${trimmedNote}`,
        actorId: admin.id,
        actorRole: "ADMIN",
      })
    })

    await createNotification({
      userId: returnRequest.order.userId,
      ...buildReturnAdminRejectedCopy(returnRequest.orderId),
    })

    await writeAuditLog(admin.id, "returnRequest.adminReject", "ReturnRequest", returnRequestId, { note: trimmedNote })
    revalidatePath(`/admin/returns/${returnRequestId}`)
    revalidatePath("/admin/returns")
    revalidatePath(`/account/orders/${returnRequest.orderId}`)
    return {}
  }

  // APPROVE
  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: "ADMIN_APPROVED",
        adminDecisionNote: trimmedNote,
        adminDecidedAt: new Date(),
        adminDecidedByUserId: admin.id,
      },
    })
    await logOrderEvent(tx, {
      orderId: returnRequest.orderId,
      type: "RETURN_ADMIN_APPROVED",
      message: "Admin approved the return/refund request.",
      actorId: admin.id,
      actorRole: "ADMIN",
    })
  })

  await createNotification({
    userId: returnRequest.order.userId,
    ...buildReturnAdminApprovedCopy(returnRequest.orderId),
  })

  const result = await executeRefund({
    orderId: returnRequest.orderId,
    reason: `Return/refund approved by admin: ${returnRequest.reason}`,
    initiatedByUserId: admin.id,
    returnRequestId: returnRequest.id,
  })

  await writeAuditLog(admin.id, "returnRequest.adminApprove", "ReturnRequest", returnRequestId, { note: trimmedNote })
  revalidatePath(`/admin/returns/${returnRequestId}`)
  revalidatePath("/admin/returns")
  revalidatePath(`/account/orders/${returnRequest.orderId}`)

  if (result.error) return { error: result.error }
  return {}
}
