import { cache } from "react"
import { prisma } from "@/lib/db"
import type { CatalogFilters, CatalogResult, ProductDetail } from "@/types"

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

  return { sort, priceMin, priceMax, rating, page }
}

function toOrderBy(sort: CatalogFilters["sort"]) {
  switch (sort) {
    case "price_asc":  return { price: "asc" as const }
    case "price_desc": return { price: "desc" as const }
    case "newest":     return { createdAt: "desc" as const }
    default:           return { sold: "desc" as const }
  }
}

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
      include: { shop: { select: { name: true, slug: true } } },
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
    products,
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
      _count: { select: { reviews: true } },
    },
  })

  if (!product) return null

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice,
    flashSalePrice: product.flashSalePrice,
    isFlashSale: product.isFlashSale,
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
