import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: { wishlist: { findMany: vi.fn() } },
}))
vi.mock('@/lib/notifications/create', () => ({ createNotification: vi.fn() }))

import { prisma } from '@/lib/db'
import { createNotification } from '@/lib/notifications/create'
import { notifyWishlistPriceDrop } from '@/lib/notifications/price-drop'

beforeEach(() => vi.clearAllMocks())

describe('notifyWishlistPriceDrop', () => {
  it('does nothing on a price increase', async () => {
    await notifyWishlistPriceDrop('p1', 'Widget', 'widget', 100, 150)
    expect(prisma.wishlist.findMany).not.toHaveBeenCalled()
    expect(createNotification).not.toHaveBeenCalled()
  })

  it('does nothing when no one has wishlisted the product', async () => {
    vi.mocked(prisma.wishlist.findMany).mockResolvedValue([])
    await notifyWishlistPriceDrop('p1', 'Widget', 'widget', 100, 80)
    expect(createNotification).not.toHaveBeenCalled()
  })

  it('notifies every user who wishlisted the product on a price decrease', async () => {
    vi.mocked(prisma.wishlist.findMany).mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }] as any)
    await notifyWishlistPriceDrop('p1', 'Widget', 'widget', 100, 80)
    expect(createNotification).toHaveBeenCalledTimes(2)
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', type: 'PRICE_DROP', link: '/product/widget' })
    )
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u2', type: 'PRICE_DROP' })
    )
  })
})
