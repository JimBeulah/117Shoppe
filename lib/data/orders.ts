import { cache } from "react"
import { prisma } from "@/lib/db"
import { escalateExpiredReturnRequests } from "@/lib/orders/timeline"
import { releaseExpiredReservations } from "@/lib/inventory/reservations"
import type { OrderWithItems } from "@/types"

export const getBuyerOrders = cache(async (userId: string): Promise<OrderWithItems[]> => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      shop: { select: { name: true, slug: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          product: { select: { id: true, name: true, slug: true, images: true } },
          variant: { select: { name: true } },
        },
      },
    },
  })
})

export async function getBuyerOrderDetail(orderId: string, userId: string) {
  await escalateExpiredReturnRequests()
  await releaseExpiredReservations()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shop: { select: { name: true, slug: true } },
      address: true,
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true, images: true } },
          variant: { select: { name: true } },
        },
      },
      shipment: true,
      payment: true,
      refund: true,
      returnRequest: true,
      timelineEvents: { orderBy: { createdAt: "asc" } },
      stockReservations: { where: { status: "HELD" }, select: { expiresAt: true } },
    },
  })
  if (!order || order.userId !== userId) return null
  return order
}
