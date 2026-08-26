import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import type { ProductCard } from "@/types"

const PAGE_SIZE = 20

// Short TTL: flash-sale stock is high-contention and shown here for browsing only.
// The actual purchase-time stock check in checkout is always a fresh, atomic DB read
// (see `app/(shop)/checkout/actions.ts`), so a few seconds of staleness here can't
// cause oversell — it can only briefly show an item as available moments after it sells out.
const FLASH_SALE_CACHE_SECONDS = 15

export function activeFlashSaleItemInclude(now: Date = new Date()) {
  return {
    where: {
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      stock: { gt: 0 },
    },
    select: { id: true, salePrice: true, stock: true, flashSale: { select: { endsAt: true } } },
    take: 1,
  } as const
}

interface ActiveFlashSaleItem {
  id: string
  salePrice: number
  stock: number
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

export const getHomeFlashSaleSection = cache(unstable_cache(async (
  limit = 10
): Promise<{ products: ProductCard[]; endsAt: Date } | null> => {
  const now = new Date()
  const items = await prisma.flashSaleItem.findMany({
    where: {
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      product: { isActive: true, status: "APPROVED", shop: { isOnVacation: false } },
      stock: { gt: 0 },
    },
    select: {
      salePrice: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          originalPrice: true,
          images: true,
          rating: true,
          reviewCount: true,
          sold: true,
          shop: { select: { name: true, slug: true } },
        },
      },
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
}, ["home-flash-sale"], { revalidate: FLASH_SALE_CACHE_SECONDS, tags: ["flash-sale"] }))

export const getAllActiveFlashSaleProducts = cache(unstable_cache(async (
  page: number
): Promise<{ products: ProductCard[]; total: number; pageSize: number }> => {
  const now = new Date()
  const where = {
    flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    product: { isActive: true, status: "APPROVED", shop: { isOnVacation: false } },
    stock: { gt: 0 },
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
}, ["all-flash-sale-products"], { revalidate: FLASH_SALE_CACHE_SECONDS, tags: ["flash-sale"] }))
