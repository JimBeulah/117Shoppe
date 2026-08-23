import { prisma } from '@/lib/db'
import type { ConversationItem } from '@/types/chat'

const MESSAGE_SELECT = {
  id: true,
  senderId: true,
  receiverId: true,
  conversationId: true,
  content: true,
  imageUrl: true,
  isRead: true,
  createdAt: true,
} as const

export async function getConversationsForBuyer(buyerId: string) {
  return prisma.conversation.findMany({
    where: { buyerId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      shop: { select: { id: true, name: true, slug: true, logo: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: MESSAGE_SELECT,
      },
    },
  })
}

export async function getConversationsForSeller(shopId: string) {
  return prisma.conversation.findMany({
    where: { shopId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      buyer: { select: { id: true, name: true, avatar: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: MESSAGE_SELECT,
      },
    },
  })
}

export async function getMessages(conversationId: string, page = 1, pageSize = 30) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: MESSAGE_SELECT,
  })
  return messages.reverse()
}

export async function getUnreadCount(userId: string) {
  return prisma.message.count({ where: { receiverId: userId, isRead: false } })
}

export async function findOrCreateConversation(buyerId: string, shopId: string) {
  return prisma.conversation.upsert({
    where: { buyerId_shopId: { buyerId, shopId } },
    create: { buyerId, shopId },
    update: {},
    select: { id: true },
  })
}

interface ConversationForItem {
  id: string
  lastMessageAt: Date
  messages: Array<{
    id: string
    senderId: string
    receiverId: string
    conversationId: string
    content: string
    imageUrl: string | null
    isRead: boolean
    createdAt: Date
  }>
}

export function toConversationItem(
  conversation: ConversationForItem,
  display: { name: string; avatar: string | null },
  currentUserId: string
): ConversationItem {
  const last = conversation.messages[0]
  return {
    id: conversation.id,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    displayName: display.name,
    displayAvatar: display.avatar,
    lastMessage: last
      ? {
          id: last.id,
          senderId: last.senderId,
          receiverId: last.receiverId,
          conversationId: last.conversationId,
          content: last.content,
          imageUrl: last.imageUrl,
          isRead: last.isRead,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
    hasUnread: !!last && !last.isRead && last.receiverId === currentUserId,
  }
}
