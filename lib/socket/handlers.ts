import type { Server, Socket } from 'socket.io'
import { verifyToken } from '@clerk/backend'
import { prisma } from '@/lib/db'
import { getUnreadCount } from '@/lib/data/chat'
import { getUnreadNotificationCount } from '@/lib/data/notifications'
import { createNotification } from '@/lib/notifications/create'
import { buildNewMessageCopy } from '@/lib/notifications/copy'

interface AuthSocket extends Socket {
  data: { userId: string }
}

export function setupSocketServer(io: Server) {
  // Auth middleware — runs before every connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Unauthorized'))

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      })
      const user = await prisma.user.findUnique({
        where: { clerkId: payload.sub },
        select: { id: true },
      })
      if (!user) return next(new Error('User not found'))
      socket.data.userId = user.id
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.data.userId

    // Join personal room so we can target this user for unread-count events
    socket.join(`user:${userId}`)

    // Push initial unread count on connect
    const initial = await getUnreadCount(userId)
    socket.emit('unread-count', { count: initial })

    const initialNotifCount = await getUnreadNotificationCount(userId)
    socket.emit('unread-notification-count', { count: initialNotifCount })

    // Join a conversation room (called when user opens a chat)
    socket.on('join-room', async ({ conversationId }: { conversationId: string }) => {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { shop: { select: { ownerId: true } } },
      })
      if (!conversation) return socket.emit('error', 'Conversation not found')

      const isBuyer = conversation.buyerId === userId
      const isSeller = conversation.shop.ownerId === userId
      if (!isBuyer && !isSeller) return socket.emit('error', 'Unauthorized')

      socket.join(conversationId)
    })

    // Send a message
    socket.on(
      'send-message',
      async ({ conversationId, content }: { conversationId: string; content: string }) => {
        if (!content?.trim()) return

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { shop: { select: { ownerId: true } } },
        })
        if (!conversation) return socket.emit('error', 'Conversation not found')

        const isBuyer = conversation.buyerId === userId
        const isSeller = conversation.shop.ownerId === userId
        if (!isBuyer && !isSeller) return socket.emit('error', 'Unauthorized')

        const receiverId = isBuyer ? conversation.shop.ownerId : conversation.buyerId

        const message = await prisma.message.create({
          data: { senderId: userId, receiverId, conversationId, content: content.trim() },
          select: { id: true, senderId: true, receiverId: true, conversationId: true, content: true, isRead: true, createdAt: true },
        })

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        })

        io.to(conversationId).emit('new-message', {
          ...message,
          createdAt: message.createdAt.toISOString(),
        })

        // Update receiver's unread count
        const count = await getUnreadCount(receiverId)
        io.to(`user:${receiverId}`).emit('unread-count', { count })

        const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
        await createNotification({ userId: receiverId, ...buildNewMessageCopy(sender?.name ?? 'Someone') })
      }
    )

    // Mark messages in a conversation as read
    socket.on('mark-read', async ({ conversationId }: { conversationId: string }) => {
      await prisma.message.updateMany({
        where: { conversationId, receiverId: userId, isRead: false },
        data: { isRead: true },
      })

      io.to(conversationId).emit('message-read', { conversationId })

      const count = await getUnreadCount(userId)
      io.to(`user:${userId}`).emit('unread-count', { count })
    })
  })
}
