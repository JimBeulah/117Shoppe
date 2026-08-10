"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { assertAdmin } from "@/lib/admin/actions"
import { createPaymongoRefund } from "@/lib/payments/paymongo"
import { createNotification } from "@/lib/notifications/create"
import { buildOrderStatusCopy } from "@/lib/notifications/copy"

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
  if (order.payment.status !== "PAID") return { error: "Payment was not captured — nothing to refund" }
  if (order.payment.provider !== "PAYMONGO") return { error: "Only online payments can be refunded here" }
  if (order.refund) return { error: "This order has already been refunded" }
  if (!order.payment.externalPaymentId) return { error: "No captured payment reference found for this order" }

  try {
    const gatewayRefund = await createPaymongoRefund(
      order.payment.externalPaymentId,
      order.payment.amount,
      reason
    )

    await prisma.$transaction([
      prisma.refund.create({
        data: {
          paymentId: order.payment.id,
          orderId: order.id,
          amount: order.payment.amount,
          status: "SUCCEEDED",
          reason,
          initiatedByUserId: admin.id,
          gatewayRefundId: gatewayRefund.id,
          processedAt: new Date(),
        },
      }),
      prisma.payment.update({ where: { id: order.payment.id }, data: { status: "REFUNDED" } }),
      prisma.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } }),
    ])

    const copy = buildOrderStatusCopy(order.id, "REFUNDED")
    if (copy) await createNotification({ userId: order.userId, ...copy })
  } catch (err) {
    console.error("[refund] issueRefund failed:", err)
    return { error: "Refund failed at the payment gateway. Please try again." }
  }

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath("/admin/orders")
  return {}
}
