import { prisma } from "@/lib/db"
import { NotificationType, type NotificationTypeValue } from "@/lib/notifications/types"

export const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeValue, string> = {
  [NotificationType.ORDER_STATUS]: "Order status updates",
  [NotificationType.REVIEW_REPLY]: "Seller replies to your reviews",
  [NotificationType.NEW_ORDER]: "New orders on your shop",
  [NotificationType.NEW_MESSAGE]: "New chat messages",
  [NotificationType.SHOP_VACATION]: "Followed shops returning from vacation",
  [NotificationType.SHOP_STAFF_ADDED]: "Being added as shop staff",
  [NotificationType.RETURN_STATUS]: "Return/refund status updates",
  [NotificationType.PRICE_DROP]: "Price drops on saved items",
}

export async function getNotificationPreferences(userId: string): Promise<Record<string, boolean>> {
  const rows = await prisma.notificationPreference.findMany({ where: { userId } })
  const overrides = new Map(rows.map((row) => [row.type, row.enabled]))

  return Object.fromEntries(
    Object.values(NotificationType).map((type) => [type, overrides.get(type) ?? true])
  )
}

export async function isNotificationTypeEnabled(userId: string, type: string): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  })
  return pref?.enabled ?? true
}

export async function setNotificationPreference(userId: string, type: string, enabled: boolean) {
  return prisma.notificationPreference.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, enabled },
    update: { enabled },
  })
}
