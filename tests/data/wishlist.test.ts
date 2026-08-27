import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/data/user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: { wishlist: { findMany: vi.fn(), count: vi.fn() } },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('getWishlistProductIds', () => {
  it('returns an empty array when signed out', async () => {
    const { getCurrentUser } = await import('@/lib/data/user')
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { getWishlistProductIds } = await import('@/lib/data/wishlist')
    const ids = await getWishlistProductIds()
    expect(ids).toEqual([])
  })

  it('returns an empty array when the query throws', async () => {
    const { getCurrentUser } = await import('@/lib/data/user')
    const { prisma } = await import('@/lib/db')
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.wishlist.findMany).mockRejectedValue(new Error('db down'))

    const { getWishlistProductIds } = await import('@/lib/data/wishlist')
    const ids = await getWishlistProductIds()
    expect(ids).toEqual([])
  })

  it('returns product ids for the signed-in user', async () => {
    const { getCurrentUser } = await import('@/lib/data/user')
    const { prisma } = await import('@/lib/db')
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.wishlist.findMany).mockResolvedValue([{ productId: 'p1' }, { productId: 'p2' }] as any)

    const { getWishlistProductIds } = await import('@/lib/data/wishlist')
    const ids = await getWishlistProductIds()
    expect(ids).toEqual(['p1', 'p2'])
  })
})

describe('getWishlistCount', () => {
  it('returns 0 when signed out', async () => {
    const { getCurrentUser } = await import('@/lib/data/user')
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { getWishlistCount } = await import('@/lib/data/wishlist')
    const count = await getWishlistCount()
    expect(count).toBe(0)
  })

  it('returns 0 when the query throws', async () => {
    const { getCurrentUser } = await import('@/lib/data/user')
    const { prisma } = await import('@/lib/db')
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.wishlist.count).mockRejectedValue(new Error('db down'))

    const { getWishlistCount } = await import('@/lib/data/wishlist')
    const count = await getWishlistCount()
    expect(count).toBe(0)
  })
})
