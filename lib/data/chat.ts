import { prisma } from '@/lib/db'

const MESSAGE_SELECT = {
  id: true,
  senderId: true,
  receiverId: true,
  conversationId: true,
  content: true,
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
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: MESSAGE_SELECT,
  })
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
