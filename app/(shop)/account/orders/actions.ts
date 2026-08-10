"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { createNotification } from "@/lib/notifications/create"
import { buildBuyerCancelledCopy, buildOrderReceivedCopy } from "@/lib/notifications/copy"
import { PAYOUT_BUFFER_DAYS } from "@/lib/payouts/config"

export async function cancelOrder(orderId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shop: { select: { ownerId: true } } },
  })
  if (!order || order.userId !== user.id) return { error: "Not found" }
  if (order.status !== "PENDING" && order.status !== "PAID") {
    return { error: "This order can no longer be cancelled" }
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } })

  await createNotification({
    userId: order.shop.ownerId,
    ...buildBuyerCancelledCopy(orderId, user.name),
  })

  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath("/account/orders")
  return {}
}

export async function markOrderReceived(orderId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shop: { select: { ownerId: true, id: true, commissionRate: true } } },
  })
  if (!order || order.userId !== user.id) return { error: "Not found" }
  if (order.status !== "SHIPPED") {
    return { error: "Only shipped orders can be marked as received" }
  }

  const commissionRate = order.shop.commissionRate
  const commissionAmount = order.total * (commissionRate / 100)
  const eligibleAt = new Date(Date.now() + PAYOUT_BUFFER_DAYS * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } }),
    prisma.shipment.updateMany({ where: { orderId }, data: { status: "DELIVERED" } }),
    prisma.commissionEntry.create({
      data: {
        orderId: order.id,
        shopId: order.shop.id,
        orderTotal: order.total,
        commissionRate,
        commissionAmount,
        netAmount: order.total - commissionAmount,
        eligibleAt,
      },
    }),
  ])

  await createNotification({
    userId: order.shop.ownerId,
    ...buildOrderReceivedCopy(orderId, user.name),
  })

  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath("/account/orders")
  return {}
}
