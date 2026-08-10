"use server"

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"

export async function getOrderStatus(orderId: string): Promise<{ status: string } | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true },
  })
  if (!order || order.userId !== user.id) return null

  return { status: order.status }
}
