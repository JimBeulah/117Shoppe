import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/data/user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/seller/queries', () => ({ getCurrentShop: vi.fn() }))
vi.mock('@/lib/data/chat', () => ({
  getConversationsForBuyer: vi.fn(),
  getConversationsForSeller: vi.fn(),
  getMessages: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ prisma: { conversation: { findUnique: vi.fn() } } }))

import { getCurrentUser } from '@/lib/data/user'
import { getCurrentShop } from '@/lib/seller/queries'
import { getConversationsForBuyer, getConversationsForSeller, getMessages } from '@/lib/data/chat'
import { prisma } from '@/lib/db'
import { GET as getConversations } from '@/app/api/conversations/route'
import { GET as getMessagesRoute } from '@/app/api/conversations/[id]/messages/route'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/conversations', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/conversations?role=buyer')
    const res = await getConversations(req)
    expect(res.status).toBe(401)
  })

  it('returns buyer conversations when role=buyer', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(getConversationsForBuyer).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/conversations?role=buyer')
    const res = await getConversations(req)
    expect(res.status).toBe(200)
    expect(getConversationsForBuyer).toHaveBeenCalledWith('u1')
  })

  it('returns seller conversations when role=seller', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(getCurrentShop).mockResolvedValue({ id: 'shop-1' } as any)
    vi.mocked(getConversationsForSeller).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/conversations?role=seller')
    const res = await getConversations(req)
    expect(res.status).toBe(200)
    expect(getConversationsForSeller).toHaveBeenCalledWith('shop-1')
  })
})

describe('GET /api/conversations/[id]/messages', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/conversations/conv-1/messages')
    const res = await getMessagesRoute(req, { params: Promise.resolve({ id: 'conv-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user does not belong to conversation', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u2' } as any)
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      id: 'conv-1',
      buyerId: 'u1',
      shop: { ownerId: 'seller-1' },
    } as any)
    const req = new NextRequest('http://localhost/api/conversations/conv-1/messages')
    const res = await getMessagesRoute(req, { params: Promise.resolve({ id: 'conv-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns messages for authorized user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      id: 'conv-1',
      buyerId: 'u1',
      shop: { ownerId: 'seller-1' },
    } as any)
    vi.mocked(getMessages).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/conversations/conv-1/messages')
    const res = await getMessagesRoute(req, { params: Promise.resolve({ id: 'conv-1' }) })
    expect(res.status).toBe(200)
    expect(getMessages).toHaveBeenCalledWith('conv-1', 1)
  })
})
