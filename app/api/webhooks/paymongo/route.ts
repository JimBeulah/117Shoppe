import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { createNotification } from "@/lib/notifications/create"
import { buildOrderStatusCopy } from "@/lib/notifications/copy"
import { verifyPaymongoSignature } from "@/lib/payments/verifyPaymongoSignature"
import { logOrderEvent } from "@/lib/orders/timeline"

export async function POST(req: Request) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response("PAYMONGO_WEBHOOK_SECRET not set", { status: 500 })
  }

  const body = await req.text()
  const headerPayload = await headers()
  const signatureHeader = headerPayload.get("paymongo-signature") ?? ""

  if (!verifyPaymongoSignature(body, signatureHeader, webhookSecret)) {
    return new Response("Invalid signature", { status: 400 })
  }

  let event: {
    data?: {
      attributes?: {
        type?: string
        data?: { id?: string; attributes?: { payments?: { id: string }[] } }
      }
    }
  }
  try {
    event = JSON.parse(body)
  } catch {
    return new Response("Invalid payload", { status: 400 })
  }

  const eventType = event.data?.attributes?.type

  if (eventType === "link.payment.paid") {
    const linkId = event.data?.attributes?.data?.id
    const paymentId = event.data?.attributes?.data?.attributes?.payments?.[0]?.id ?? null

    if (!linkId) return new Response("Missing link id", { status: 400 })

    try {
      const siblings = await prisma.payment.findMany({ where: { checkoutSessionId: linkId } })

      for (const payment of siblings) {
        if (payment.status === "PAID") continue

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
              externalPaymentId: paymentId,
              metadata: event as object,
            },
          })
          await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } })
          await logOrderEvent(tx, {
            orderId: payment.orderId,
            type: "PAYMENT_RECEIVED",
            message: "Payment confirmed.",
          })
        })

        const order = await prisma.order.findUnique({
          where: { id: payment.orderId },
          select: { userId: true },
        })
        const copy = buildOrderStatusCopy(payment.orderId, "PAID")
        if (order && copy) await createNotification({ userId: order.userId, ...copy })
      }
    } catch (err) {
      console.error("[webhook] paymongo link.payment.paid handler failed:", err)
      return new Response("Internal error", { status: 500 })
    }
  }

  return new Response("OK", { status: 200 })
}
