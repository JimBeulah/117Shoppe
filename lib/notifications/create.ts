import { prisma } from "@/lib/db"
import { getIO } from "@/lib/socket/io"
import { isNotificationTypeEnabled } from "@/lib/notifications/preferences"

interface CreateNotificationInput {
  userId: string
  type: string
  title: string
  message: string
  link?: string | null
}

export async function createNotification({ userId, type, title, message, link = null }: CreateNotificationInput) {
  if (!(await isNotificationTypeEnabled(userId, type))) return null

  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link },
  })

  const io = getIO()
  if (io) {
    io.to(`user:${userId}`).emit("notification", {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    })

    const count = await prisma.notification.count({ where: { userId, isRead: false } })
    io.to(`user:${userId}`).emit("unread-notification-count", { count })
  }

  return notification
}
