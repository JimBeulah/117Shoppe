import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/data/user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/app/(shop)/cart/actions', () => ({ addToCart: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: {
    product: { findUnique: vi.fn() },
    wishlist: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  },
}))

import { getCurrentUser } from '@/lib/data/user'
import { addToCart } from '@/app/(shop)/cart/actions'
import { prisma } from '@/lib/db'
import { toggleWishlist, moveToCart } from '@/app/(shop)/account/wishlist/actions'

beforeEach(() => vi.clearAllMocks())

describe('toggleWishlist', () => {
  it('returns an error when signed out', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const result = await toggleWishlist('p1')
    expect(result).toEqual({ error: 'Sign in to save items to your wishlist.' })
  })

  it('returns an error when the product does not exist', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null)
    const result = await toggleWishlist('missing')
    expect(result).toEqual({ error: 'Product not found.' })
  })

  it('creates a wishlist row when not yet saved', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'p1' } as any)
    vi.mocked(prisma.wishlist.findUnique).mockResolvedValue(null)
    const result = await toggleWishlist('p1')
    expect(prisma.wishlist.create).toHaveBeenCalledWith({ data: { userId: 'u1', productId: 'p1' } })
    expect(result).toEqual({ wishlisted: true })
  })

  it('deletes the wishlist row when already saved', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'p1' } as any)
    vi.mocked(prisma.wishlist.findUnique).mockResolvedValue({ id: 'w1' } as any)
    const result = await toggleWishlist('p1')
    expect(prisma.wishlist.delete).toHaveBeenCalled()
    expect(result).toEqual({ wishlisted: false })
  })
})

describe('moveToCart', () => {
  it('returns an error when signed out', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const result = await moveToCart('p1')
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('rejects products with variants', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ variants: [{ id: 'v1' }] } as any)
    const result = await moveToCart('p1')
    expect(result).toEqual({ error: 'Choose options on the product page.' })
    expect(addToCart).not.toHaveBeenCalled()
  })

  it('leaves the wishlist row in place when addToCart errors', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ variants: [] } as any)
    vi.mocked(addToCart).mockResolvedValue({ error: 'This item is out of stock.' })
    const result = await moveToCart('p1')
    expect(result).toEqual({ error: 'This item is out of stock.' })
    expect(prisma.wishlist.deleteMany).not.toHaveBeenCalled()
  })

  it('adds to cart and removes the wishlist row on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ variants: [] } as any)
    vi.mocked(addToCart).mockResolvedValue({})
    const result = await moveToCart('p1')
    expect(result).toEqual({})
    expect(prisma.wishlist.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', productId: 'p1' } })
  })
})
