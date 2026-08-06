"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { createNotification } from "@/lib/notifications/create"
import { buildBuyerCancelledCopy, buildOrderReceivedCopy } from "@/lib/notifications/copy"

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
    include: { shop: { select: { ownerId: true } } },
  })
  if (!order || order.userId !== user.id) return { error: "Not found" }
  if (order.status !== "SHIPPED") {
    return { error: "Only shipped orders can be marked as received" }
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } }),
    prisma.shipment.updateMany({ where: { orderId }, data: { status: "DELIVERED" } }),
  ])

  await createNotification({
    userId: order.shop.ownerId,
    ...buildOrderReceivedCopy(orderId, user.name),
  })

  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath("/account/orders")
  return {}
}
