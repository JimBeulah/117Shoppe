import { prisma } from "@/lib/db"
import { createPaymongoRefund } from "@/lib/payments/paymongo"
import { createNotification } from "@/lib/notifications/create"
import { buildReturnRefundCompletedCopy } from "@/lib/notifications/copy"
import { logOrderEvent } from "@/lib/orders/timeline"
import { adjustStock } from "@/lib/inventory/stock"
import { grantCoins, clawbackCoins } from "@/lib/coins/ledger"

const REFUND_ELIGIBLE_STATUSES = ["PAID", "SHIPPED", "DELIVERED", "CANCELLED"]

export async function executeRefund(params: {
  orderId: string
  reason: string
  initiatedByUserId: string
  returnRequestId?: string
}): Promise<{ error?: string; refundId?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payment: true, refund: true, items: true },
  })
  if (!order || !order.payment) return { error: "Order or payment not found" }
  if (!REFUND_ELIGIBLE_STATUSES.includes(order.status)) {
    return { error: "Order is not eligible for a refund" }
  }
  if (order.refund) return { error: "This order has already been refunded" }

  // A cancelled order was already restocked by cancelOrder — avoid restocking twice.
  const alreadyRestocked =
    order.status === "CANCELLED" &&
    (await prisma.stockMovement.findFirst({
      where: { orderId: order.id, type: "CANCELLATION_RESTOCK" },
      select: { id: true },
    })) != null

  // A cancelled order already had its redeemed coins returned by cancelOrder,
  // in the same event that set alreadyRestocked — skip a duplicate return.
  const coinsAlreadyReturned = alreadyRestocked

  // Only a delivered order has accrued cashback to claw back.
  const earnedCoin =
    order.status === "DELIVERED"
      ? await prisma.coin.findFirst({
          where: { userId: order.userId, orderId: order.id, type: "EARNED" },
          select: { amount: true },
        })
      : null

  let refundId: string

  if (order.payment.provider === "PAYMONGO") {
    if (order.payment.status !== "PAID") return { error: "Payment was not captured — nothing to refund" }
    if (!order.payment.externalPaymentId) return { error: "No captured payment reference found for this order" }

    try {
      const gatewayRefund = await createPaymongoRefund(
        order.payment.externalPaymentId,
        order.payment.amount,
        params.reason
      )

      await prisma.$transaction(async (tx) => {
        const refund = await tx.refund.create({
          data: {
            paymentId: order.payment!.id,
            orderId: order.id,
            amount: order.payment!.amount,
            status: "SUCCEEDED",
            reason: params.reason,
            initiatedByUserId: params.initiatedByUserId,
            gatewayRefundId: gatewayRefund.id,
            processedAt: new Date(),
          },
        })
        refundId = refund.id
        await tx.payment.update({ where: { id: order.payment!.id }, data: { status: "REFUNDED" } })
        await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } })
        await tx.commissionEntry.updateMany({
          where: { orderId: order.id, status: { in: ["PENDING", "AVAILABLE"] } },
          data: { status: "REVERSED" },
        })
        if (!alreadyRestocked) {
          for (const item of order.items) {
            await adjustStock(tx, {
              productId: item.productId,
              variantId: item.variantId,
              shopId: order.shopId,
              delta: item.quantity,
              type: "REFUND_RESTOCK",
              orderId: order.id,
              actorId: params.initiatedByUserId,
            })
          }
        }
        if (!coinsAlreadyReturned && order.coinsUsed > 0) {
          await grantCoins(tx, {
            userId: order.userId,
            coins: order.coinsUsed,
            type: "REFUNDED",
            orderId: order.id,
            description: "Coins returned — order refunded",
          })
        }
        if (earnedCoin && earnedCoin.amount > 0) {
          await clawbackCoins(tx, {
            userId: order.userId,
            coins: earnedCoin.amount,
            orderId: order.id,
            description: "Cashback reversed — order refunded",
          })
        }
        if (params.returnRequestId) {
          await tx.returnRequest.update({
            where: { id: params.returnRequestId },
            data: { status: "COMPLETED", refundId: refund.id, resolvedAt: new Date() },
          })
        }
        await logOrderEvent(tx, {
          orderId: order.id,
          type: "REFUND_ISSUED",
          message: `Refund of ₱${order.payment!.amount.toFixed(2)} issued.`,
          actorId: params.initiatedByUserId,
        })
      })
    } catch (err) {
      console.error("[refund] executeRefund (PAYMONGO) failed:", err)
      return { error: "Refund failed at the payment gateway. Please try again." }
    }
  } else {
    // COD: no gateway to call — settlement happens manually off-platform.
    try {
      await prisma.$transaction(async (tx) => {
        const refund = await tx.refund.create({
          data: {
            paymentId: order.payment!.id,
            orderId: order.id,
            amount: order.payment!.amount,
            status: "PENDING",
            reason: params.reason,
            initiatedByUserId: params.initiatedByUserId,
          },
        })
        refundId = refund.id
        await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } })
        if (!alreadyRestocked) {
          for (const item of order.items) {
            await adjustStock(tx, {
              productId: item.productId,
              variantId: item.variantId,
              shopId: order.shopId,
              delta: item.quantity,
              type: "REFUND_RESTOCK",
              orderId: order.id,
              actorId: params.initiatedByUserId,
            })
          }
        }
        if (!coinsAlreadyReturned && order.coinsUsed > 0) {
          await grantCoins(tx, {
            userId: order.userId,
            coins: order.coinsUsed,
            type: "REFUNDED",
            orderId: order.id,
            description: "Coins returned — order refunded",
          })
        }
        if (earnedCoin && earnedCoin.amount > 0) {
          await clawbackCoins(tx, {
            userId: order.userId,
            coins: earnedCoin.amount,
            orderId: order.id,
            description: "Cashback reversed — order refunded",
          })
        }
        if (params.returnRequestId) {
          await tx.returnRequest.update({
            where: { id: params.returnRequestId },
            data: { status: "COMPLETED", refundId: refund.id, resolvedAt: new Date() },
          })
        }
        await logOrderEvent(tx, {
          orderId: order.id,
          type: "REFUND_ISSUED",
          message: `Refund of ₱${order.payment!.amount.toFixed(2)} approved — pending manual settlement (COD order).`,
          actorId: params.initiatedByUserId,
        })
      })
    } catch (err) {
      console.error("[refund] executeRefund (COD) failed:", err)
      return { error: "Failed to record the refund. Please try again." }
    }
  }

  await createNotification({ userId: order.userId, ...buildReturnRefundCompletedCopy(order.id) })

  return { refundId: refundId! }
}
