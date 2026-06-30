import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }),
}))

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('@/lib/data/user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/data/chat', () => ({ findOrCreateConversation: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: { shop: { findUnique: vi.fn() } },
}))

import { getCurrentUser } from '@/lib/data/user'
import { findOrCreateConversation } from '@/lib/data/chat'
import { prisma } from '@/lib/db'
import { startConversation } from '@/lib/chat/actions'

beforeEach(() => vi.clearAllMocks())

describe('startConversation', () => {
  it('redirects to sign-in when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    await expect(startConversation('shop-1')).rejects.toThrow('REDIRECT:/sign-in')
  })

  it('returns error when shop not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.shop.findUnique).mockResolvedValue(null)
    const result = await startConversation('bad-shop')
    expect(result).toEqual({ error: 'Shop not found' })
  })

  it('redirects to /chat?c= with conversation id on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: 'shop-1' } as any)
    vi.mocked(findOrCreateConversation).mockResolvedValue({ id: 'conv-1' })
    await expect(startConversation('shop-1')).rejects.toThrow('REDIRECT:/chat?c=conv-1')
  })
})
