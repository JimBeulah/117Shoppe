import { cache } from "react"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import type { CatalogFilters, CatalogResult, CategoryItem, ProductCard, ProductDetail, ShopDetail } from "@/types"
import { activeFlashSaleItemInclude, mapFlashSale } from "@/lib/data/flashSale"

const PAGE_SIZE = 20

export function parseCatalogFilters(
  searchParams: Record<string, string | string[] | undefined>
): CatalogFilters {
  const get = (key: string): string | undefined => {
    const v = searchParams[key]
    return typeof v === "string" ? v : undefined
  }

  const sortRaw = get("sort")
  const sort: CatalogFilters["sort"] =
    sortRaw === "price_asc" || sortRaw === "price_desc" || sortRaw === "newest"
      ? sortRaw
      : "best_seller"

  const priceMinRaw = Number(get("price_min") ?? 0)
  const priceMin = Number.isFinite(priceMinRaw) ? Math.max(0, priceMinRaw) : 0
  const priceMaxRaw = Number(get("price_max") ?? "")
  const priceMax = Number.isFinite(priceMaxRaw) && get("price_max") !== undefined ? priceMaxRaw : null

  const ratingRaw = get("rating")
  const rating = ratingRaw === "4" ? 4 : ratingRaw === "3" ? 3 : null

  const page = Math.max(1, Number(get("page") ?? 1))
  const q = get("q") ?? ""
  const category = get("category") ?? null

  return { sort, priceMin, priceMax, rating, page, q, category }
}

function toOrderBy(sort: CatalogFilters["sort"]) {
  switch (sort) {
    case "price_asc":  return { price: "asc" as const }
    case "price_desc": return { price: "desc" as const }
    case "newest":     return { createdAt: "desc" as const }
    default:           return { sold: "desc" as const }
  }
}

export function buildSearchWhere(filters: CatalogFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true }

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ]
  }

  if (filters.category) {
    where.category = { slug: filters.category }
  }

  if (filters.priceMin > 0 || filters.priceMax !== null) {
    where.price = {
      ...(filters.priceMin > 0 ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax !== null ? { lte: filters.priceMax } : {}),
    }
  }

  if (filters.rating !== null) {
    where.rating = { gte: filters.rating }
  }

  return where
}

export const searchProducts = cache(async (
  filters: CatalogFilters
): Promise<{ products: ProductCard[]; total: number; pageSize: number }> => {
  const where = buildSearchWhere(filters)

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        shop: { select: { name: true, slug: true } },
        flashSaleItems: activeFlashSaleItemInclude(),
      },
      orderBy: toOrderBy(filters.sort),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ])

  return { products: products.map(mapFlashSale), total, pageSize: PAGE_SIZE }
})

export const getParentCategories = cache(async (): Promise<CategoryItem[]> => {
  return prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true, slug: true, icon: true },
    orderBy: { name: "asc" },
  })
})

export const getCategoryWithProducts = cache(async (
  slug: string,
  level: "parent" | "child",
  filters: CatalogFilters
): Promise<CatalogResult | null> => {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!category) return null

  const categoryIds =
    level === "parent"
      ? [category.id, ...category.children.map((c) => c.id)]
      : [category.id]

  const where = {
    isActive: true,
    categoryId: { in: categoryIds },
    price: {
      gte: filters.priceMin,
      ...(filters.priceMax !== null ? { lte: filters.priceMax } : {}),
    },
    ...(filters.rating !== null ? { rating: { gte: filters.rating } } : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        shop: { select: { name: true, slug: true } },
        flashSaleItems: activeFlashSaleItemInclude(),
      },
      orderBy: toOrderBy(filters.sort),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ])

  return {
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      parent: category.parent,
      children: category.children,
    },
    products: products.map(mapFlashSale),
    total,
    pageSize: PAGE_SIZE,
  }
})

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: true,
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          rating: true,
          followersCount: true,
        },
      },
      category: {
        include: {
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
      flashSaleItems: activeFlashSaleItemInclude(),
      _count: { select: { reviews: true } },
    },
  })

  if (!product) return null

  const { isFlashSale, flashSalePrice, flashSaleEndsAt } = mapFlashSale(product)

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice,
    flashSalePrice,
    isFlashSale,
    flashSaleEndsAt,
    stock: product.stock,
    sold: product.sold,
    images: product.images,
    rating: product.rating,
    reviewCount: product.reviewCount,
    variants: product.variants,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
      parent: product.category.parent,
    },
    shop: product.shop,
    _count: product._count,
  }
})

export const getShopBySlug = cache(async (slug: string): Promise<ShopDetail | null> => {
  const shop = await prisma.shop.findUnique({
    where: { slug, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      banner: true,
      rating: true,
      followersCount: true,
      createdAt: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  })
  return shop
})

export const getShopProducts = cache(async (
  shopId: string,
  filters: CatalogFilters
): Promise<{ products: ProductCard[]; total: number; pageSize: number }> => {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    shopId,
    ...(filters.priceMin > 0 || filters.priceMax !== null
      ? {
          price: {
            ...(filters.priceMin > 0 ? { gte: filters.priceMin } : {}),
            ...(filters.priceMax !== null ? { lte: filters.priceMax } : {}),
          },
        }
      : {}),
    ...(filters.rating !== null ? { rating: { gte: filters.rating } } : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        shop: { select: { name: true, slug: true } },
        flashSaleItems: activeFlashSaleItemInclude(),
      },
      orderBy: toOrderBy(filters.sort),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ])

  return { products: products.map(mapFlashSale), total, pageSize: PAGE_SIZE }
})
