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

async function isSellerForShop(userId: string, shopId: string, ownerId: string): Promise<boolean> {
  if (ownerId === userId) return true
  const staff = await prisma.shopStaff.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { permissions: true },
  })
  return !!staff && staff.permissions.includes('CHAT')
}

/** Simple fixed-window token bucket, one per connection, to stop a single socket from spamming an event. */
class RateLimiter {
  private count = 0
  private windowStart = Date.now()
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  allow(): boolean {
    const now = Date.now()
    if (now - this.windowStart >= this.windowMs) {
      this.windowStart = now
      this.count = 0
    }
    this.count += 1
    return this.count <= this.limit
  }
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

    // Typing indicator auto-timeout guards, scoped per-connection so they're GC'd on disconnect
    const typingTimeouts = new Map<string, NodeJS.Timeout>()

    // Authorization results cached per connection after join-room, so
    // send-message doesn't re-query the conversation + staff permissions
    // on every message.
    const authorizedConversations = new Map<string, boolean>()

    const sendMessageLimiter = new RateLimiter(20, 10_000) // 20 messages / 10s
    const typingLimiter = new RateLimiter(30, 10_000) // 30 typing events / 10s

    // Join a conversation room (called when user opens a chat)
    socket.on('join-room', async ({ conversationId }: { conversationId: string }) => {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { shop: { select: { ownerId: true } } },
      })
      if (!conversation) return socket.emit('error', 'Conversation not found')

      const isBuyer = conversation.buyerId === userId
      const isSeller = await isSellerForShop(userId, conversation.shopId, conversation.shop.ownerId)
      if (!isBuyer && !isSeller) return socket.emit('error', 'Unauthorized')

      authorizedConversations.set(conversationId, true)
      socket.join(conversationId)
    })

    // Send a message
    socket.on(
      'send-message',
      async ({ conversationId, content, imageUrl }: { conversationId: string; content: string; imageUrl?: string | null }) => {
        if (!sendMessageLimiter.allow()) return socket.emit('error', 'Rate limit exceeded')

        const trimmed = content?.trim() ?? ''
        if (!trimmed && !imageUrl) return

        let conversation: { buyerId: string; shopId: string; shop: { ownerId: string } } | null = null
        if (!authorizedConversations.has(conversationId)) {
          conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { shop: { select: { ownerId: true } } },
          })
          if (!conversation) return socket.emit('error', 'Conversation not found')

          const isBuyer = conversation.buyerId === userId
          const isSeller = await isSellerForShop(userId, conversation.shopId, conversation.shop.ownerId)
          if (!isBuyer && !isSeller) return socket.emit('error', 'Unauthorized')
          authorizedConversations.set(conversationId, true)
        } else {
          // Still need buyerId/shop.ownerId to compute the receiver — cheap
          // lookup, but skips the isSellerForShop permission re-check.
          conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { shop: { select: { ownerId: true } } },
          })
          if (!conversation) return socket.emit('error', 'Conversation not found')
        }

        const isBuyer = conversation.buyerId === userId
        const receiverId = isBuyer ? conversation.shop.ownerId : conversation.buyerId

        const message = await prisma.message.create({
          data: { senderId: userId, receiverId, conversationId, content: trimmed, imageUrl: imageUrl ?? null },
          select: { id: true, senderId: true, receiverId: true, conversationId: true, content: true, imageUrl: true, isRead: true, createdAt: true },
        })

        const [, sender] = await Promise.all([
          prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
          }),
          prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
        ])

        io.to(conversationId).emit('new-message', {
          ...message,
          createdAt: message.createdAt.toISOString(),
        })

        // Update receiver's unread count
        const count = await getUnreadCount(receiverId)
        io.to(`user:${receiverId}`).emit('unread-count', { count })

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

    // Typing indicators
    socket.on('typing-start', ({ conversationId }: { conversationId: string }) => {
      if (!typingLimiter.allow()) return

      const key = `${conversationId}:${userId}`
      socket.to(conversationId).emit('user-typing', { conversationId, userId })

      clearTimeout(typingTimeouts.get(key))
      typingTimeouts.set(
        key,
        setTimeout(() => {
          socket.to(conversationId).emit('user-stopped-typing', { conversationId, userId })
          typingTimeouts.delete(key)
        }, 5000)
      )
    })

    socket.on('typing-stop', ({ conversationId }: { conversationId: string }) => {
      const key = `${conversationId}:${userId}`
      clearTimeout(typingTimeouts.get(key))
      typingTimeouts.delete(key)
      socket.to(conversationId).emit('user-stopped-typing', { conversationId, userId })
    })
  })
}
