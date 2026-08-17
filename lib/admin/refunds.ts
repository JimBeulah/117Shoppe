"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { assertAdmin } from "@/lib/admin/actions"
import { writeAuditLog } from "@/lib/admin/audit"
import { executeRefund } from "@/lib/payments/refund-core"

export async function issueRefund(orderId: string, reason: string): Promise<{ error?: string }> {
  await assertAdmin()
  const admin = await getCurrentUser()
  if (!admin) return { error: "Unauthorized" }
  if (!reason.trim()) return { error: "A reason is required" }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, refund: true },
  })
  if (!order || !order.payment) return { error: "Order or payment not found" }
  if (order.status !== "PAID" && order.status !== "CANCELLED") {
    return { error: "Order is not eligible for a refund" }
  }
  if (order.payment.provider !== "PAYMONGO") return { error: "Only online payments can be refunded here" }
  if (order.refund) return { error: "This order has already been refunded" }

  const result = await executeRefund({ orderId, reason, initiatedByUserId: admin.id })
  if (result.error) return result

  await writeAuditLog(admin.id, "payment.refund", "Order", orderId, { reason })
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath("/admin/orders")
  revalidatePath("/admin/payments")
  return {}
}

export async function markRefundSettled(refundId: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()

  const refund = await prisma.refund.findUnique({ where: { id: refundId } })
  if (!refund) return { error: "Refund not found" }
  if (refund.status !== "PENDING") return { error: "This refund is not awaiting settlement" }

  await prisma.refund.update({
    where: { id: refundId },
    data: { status: "SUCCEEDED", processedAt: new Date() },
  })

  await writeAuditLog(admin.id, "payment.markRefundSettled", "Refund", refundId)
  revalidatePath(`/admin/orders/${refund.orderId}`)
  revalidatePath("/admin/payments")
  revalidatePath("/admin/returns")
  return {}
}
