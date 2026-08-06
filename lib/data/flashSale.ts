import { cache } from "react"
import { prisma } from "@/lib/db"
import type { ProductCard } from "@/types"

const PAGE_SIZE = 20

export function activeFlashSaleItemInclude(now: Date = new Date()) {
  return {
    where: {
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    select: { salePrice: true, flashSale: { select: { endsAt: true } } },
    take: 1,
  } as const
}

interface ActiveFlashSaleItem {
  salePrice: number
  flashSale: { endsAt: Date }
}

export function mapFlashSale<T extends { flashSaleItems: ActiveFlashSaleItem[] }>(
  product: T
): Omit<T, "flashSaleItems"> & {
  isFlashSale: boolean
  flashSalePrice: number | null
  flashSaleEndsAt: Date | null
} {
  const { flashSaleItems, ...rest } = product
  const active = flashSaleItems[0]
  return {
    ...rest,
    isFlashSale: !!active,
    flashSalePrice: active?.salePrice ?? null,
    flashSaleEndsAt: active?.flashSale.endsAt ?? null,
  }
}

export function effectivePrice(
  product: { price: number; flashSaleItems: ActiveFlashSaleItem[] },
  variant: { price: number } | null
): number {
  if (variant) return variant.price
  return product.flashSaleItems[0]?.salePrice ?? product.price
}

export const getHomeFlashSaleSection = cache(async (
  limit = 10
): Promise<{ products: ProductCard[]; endsAt: Date } | null> => {
  const now = new Date()
  const items = await prisma.flashSaleItem.findMany({
    where: {
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      product: { isActive: true },
    },
    include: {
      product: { include: { shop: { select: { name: true, slug: true } } } },
      flashSale: { select: { endsAt: true } },
    },
    orderBy: { product: { sold: "desc" } },
    take: limit,
  })

  if (items.length === 0) return null

  const endsAt = items.reduce(
    (min, item) => (item.flashSale.endsAt < min ? item.flashSale.endsAt : min),
    items[0].flashSale.endsAt
  )

  const products: ProductCard[] = items.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    slug: item.product.slug,
    price: item.product.price,
    originalPrice: item.product.originalPrice,
    flashSalePrice: item.salePrice,
    flashSaleEndsAt: item.flashSale.endsAt,
    isFlashSale: true,
    images: item.product.images,
    rating: item.product.rating,
    reviewCount: item.product.reviewCount,
    sold: item.product.sold,
    shop: item.product.shop,
  }))

  return { products, endsAt }
})

export const getAllActiveFlashSaleProducts = cache(async (
  page: number
): Promise<{ products: ProductCard[]; total: number; pageSize: number }> => {
  const now = new Date()
  const where = {
    flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    product: { isActive: true },
  } as const

  const [items, total] = await Promise.all([
    prisma.flashSaleItem.findMany({
      where,
      include: {
        product: { include: { shop: { select: { name: true, slug: true } } } },
        flashSale: { select: { endsAt: true } },
      },
      orderBy: { product: { sold: "desc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.flashSaleItem.count({ where }),
  ])

  const products: ProductCard[] = items.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    slug: item.product.slug,
    price: item.product.price,
    originalPrice: item.product.originalPrice,
    flashSalePrice: item.salePrice,
    flashSaleEndsAt: item.flashSale.endsAt,
    isFlashSale: true,
    images: item.product.images,
    rating: item.product.rating,
    reviewCount: item.product.reviewCount,
    sold: item.product.sold,
    shop: item.product.shop,
  }))

  return { products, total, pageSize: PAGE_SIZE }
})
