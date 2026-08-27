import { cache } from "react"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import type { WishlistItem } from "@/types"

const PAGE_SIZE = 12

export const getWishlistProductIds = cache(async (): Promise<string[]> => {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    const rows = await prisma.wishlist.findMany({
      where: { userId: user.id },
      select: { productId: true },
    })
    return rows.map((r) => r.productId)
  } catch {
    return []
  }
})

export async function getWishlistCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) return 0

  try {
    return await prisma.wishlist.count({ where: { userId: user.id } })
  } catch {
    return 0
  }
}

export async function getWishlistPage(
  page: number
): Promise<{ items: WishlistItem[]; total: number; pageSize: number }> {
  const user = await getCurrentUser()
  if (!user) return { items: [], total: 0, pageSize: PAGE_SIZE }

  const [rows, total] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        product: {
          include: {
            shop: { select: { name: true, slug: true, isOnVacation: true } },
            variants: { select: { id: true }, take: 1 },
          },
        },
      },
    }),
    prisma.wishlist.count({ where: { userId: user.id } }),
  ])

  const items: WishlistItem[] = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    product: {
      id: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      price: row.product.price,
      originalPrice: row.product.originalPrice,
      images: row.product.images,
      stock: row.product.stock,
      isActive: row.product.isActive,
      status: row.product.status,
      hasVariants: row.product.variants.length > 0,
      shop: {
        name: row.product.shop.name,
        slug: row.product.shop.slug,
        isOnVacation: row.product.shop.isOnVacation,
      },
    },
  }))

  return { items, total, pageSize: PAGE_SIZE }
}
