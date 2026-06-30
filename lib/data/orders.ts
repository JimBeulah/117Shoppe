import { cache } from "react"
import { prisma } from "@/lib/db"
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
