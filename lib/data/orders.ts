import { cache } from "react"
import { prisma } from "@/lib/db"
import { escalateExpiredReturnRequests } from "@/lib/orders/timeline"
import { releaseExpiredReservations } from "@/lib/inventory/reservations"
import type { OrderWithItems } from "@/types"

const BUYER_ORDERS_PAGE_SIZE = 20

export const getBuyerOrders = cache(async (
  userId: string,
  page = 1
): Promise<{ orders: OrderWithItems[]; total: number; pageSize: number }> => {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * BUYER_ORDERS_PAGE_SIZE,
      take: BUYER_ORDERS_PAGE_SIZE,
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
    }),
    prisma.order.count({ where: { userId } }),
  ])
  return { orders, total, pageSize: BUYER_ORDERS_PAGE_SIZE }
})

export async function getBuyerOrderDetail(orderId: string, userId: string) {
  await escalateExpiredReturnRequests(orderId)
  await releaseExpiredReservations({ orderId })

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
