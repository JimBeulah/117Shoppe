import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import {
  getConversationsForBuyer,
  getConversationsForSeller,
  getMessages,
  getUnreadCount,
  findOrCreateConversation,
} from '@/lib/data/chat'

const mockMessage = {
  id: 'm1',
  senderId: 'u1',
  receiverId: 'u2',
  content: 'Hello',
  isRead: false,
  createdAt: new Date('2026-06-30T10:00:00Z'),
}

beforeEach(() => vi.clearAllMocks())

describe('getConversationsForBuyer', () => {
  it('queries by buyerId ordered by lastMessageAt desc', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([])
    await getConversationsForBuyer('buyer-1')
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { buyerId: 'buyer-1' },
        orderBy: { lastMessageAt: 'desc' },
      })
    )
  })
})

describe('getConversationsForSeller', () => {
  it('queries by shopId ordered by lastMessageAt desc', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([])
    await getConversationsForSeller('shop-1')
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopId: 'shop-1' },
        orderBy: { lastMessageAt: 'desc' },
      })
    )
  })
})

describe('getMessages', () => {
  it('fetches page 1 (most recent messages) with default page size 30', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    await getMessages('conv-1')
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 30,
      })
    )
  })

  it('returns messages in chronological order', async () => {
    const older = { ...mockMessage, id: 'm1', conversationId: 'conv-1', createdAt: new Date('2026-06-30T10:00:00Z') }
    const newer = { ...mockMessage, id: 'm2', conversationId: 'conv-1', createdAt: new Date('2026-06-30T10:01:00Z') }
    vi.mocked(prisma.message.findMany).mockResolvedValue([newer, older])
    const result = await getMessages('conv-1')
    expect(result).toEqual([older, newer])
  })

  it('calculates correct skip for page 2', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    await getMessages('conv-1', 2)
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 30, take: 30 })
    )
  })
})

describe('getUnreadCount', () => {
  it('counts unread messages for receiver', async () => {
    vi.mocked(prisma.message.count).mockResolvedValue(3)
    const result = await getUnreadCount('user-1')
    expect(result).toBe(3)
    expect(prisma.message.count).toHaveBeenCalledWith({
      where: { receiverId: 'user-1', isRead: false },
    })
  })
})

describe('findOrCreateConversation', () => {
  it('upserts by buyerId + shopId and returns id', async () => {
    vi.mocked(prisma.conversation.upsert).mockResolvedValue({ id: 'conv-1' } as any)
    const result = await findOrCreateConversation('buyer-1', 'shop-1')
    expect(result).toEqual({ id: 'conv-1' })
    expect(prisma.conversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { buyerId_shopId: { buyerId: 'buyer-1', shopId: 'shop-1' } },
      })
    )
  })
})
