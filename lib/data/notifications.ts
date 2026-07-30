import { cache } from "react"
import { prisma } from "@/lib/db"

const PAGE_SIZE = 20

export const getNotifications = cache(async (userId: string, page = 1, pageSize = PAGE_SIZE) => {
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: { userId } }),
  ])
  return { notifications, total, pageSize }
})

export const getUnreadNotificationCount = cache(async (userId: string) => {
  return prisma.notification.count({ where: { userId, isRead: false } })
})

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } })
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
}
