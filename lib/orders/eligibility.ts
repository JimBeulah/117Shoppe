import { RETURN_WINDOW_DAYS } from "@/lib/orders/config"

type EligibilityOrder = {
  status: string
  updatedAt: Date
  returnRequest?: { id: string } | null
  timelineEvents?: { type: string; createdAt: Date }[]
}

export function getDeliveredAt(order: EligibilityOrder): Date | null {
  const deliveredEvent = order.timelineEvents?.find((e) => e.type === "ORDER_DELIVERED")
  if (deliveredEvent) return deliveredEvent.createdAt
  return order.status === "DELIVERED" ? order.updatedAt : null
}

export function canRequestReturn(order: EligibilityOrder): boolean {
  if (order.status !== "DELIVERED") return false
  if (order.returnRequest) return false

  const deliveredAt = getDeliveredAt(order)
  if (!deliveredAt) return false

  const windowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - deliveredAt.getTime() <= windowMs
}
