import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import type { ProductSuggestion } from "@/types/search"

const SUGGESTION_LIMIT = 6
const RECENT_SEARCH_LIMIT = 8
const POPULAR_SEARCH_LIMIT = 8
const POPULAR_WINDOW_DAYS = 7

// Live product-name suggestions as the user types.
export async function getProductSuggestions(q: string): Promise<ProductSuggestion[]> {
  const query = q.trim()
  if (!query) return []

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      status: "APPROVED",
      shop: { isOnVacation: false },
      name: { contains: query, mode: "insensitive" },
    },
    select: { id: true, name: true, slug: true, images: true },
    orderBy: { sold: "desc" },
    take: SUGGESTION_LIMIT,
  })

  return products.map((p) => ({ id: p.id, name: p.name, slug: p.slug, image: p.images[0] ?? null }))
}

// Recent distinct search terms for a logged-in user, most recent first.
export const getRecentSearches = cache(async (userId: string): Promise<string[]> => {
  const rows = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { query: true },
    take: 30,
  })

  const seen = new Set<string>()
  const distinct: string[] = []
  for (const row of rows) {
    const key = row.query.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    distinct.push(row.query.trim())
    if (distinct.length >= RECENT_SEARCH_LIMIT) break
  }
  return distinct
})

// Popular search terms over the last week, cached across requests.
export const getPopularSearches = unstable_cache(
  async (): Promise<string[]> => {
    const since = new Date(Date.now() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    const grouped = await prisma.searchHistory.groupBy({
      by: ["query"],
      where: { createdAt: { gte: since } },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: POPULAR_SEARCH_LIMIT * 3,
    })

    // Prisma's groupBy is case-sensitive on the raw column, so re-merge
    // case-insensitively in JS (dataset is small — capped by the over-fetch above).
    const merged = new Map<string, { display: string; count: number }>()
    for (const g of grouped) {
      const key = g.query.trim().toLowerCase()
      if (!key) continue
      const existing = merged.get(key)
      if (existing) {
        existing.count += g._count.query
      } else {
        merged.set(key, { display: g.query.trim(), count: g._count.query })
      }
    }

    return [...merged.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, POPULAR_SEARCH_LIMIT)
      .map((v) => v.display)
  },
  ["popular-searches"],
  { revalidate: 300 }
)

// Records a search, deduping consecutive identical queries from the same user.
export async function recordSearchHistory(userId: string, rawQuery: string): Promise<void> {
  const query = rawQuery.trim()
  if (!query) return

  const last = await prisma.searchHistory.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { query: true },
  })
  if (last && last.query.trim().toLowerCase() === query.toLowerCase()) return

  await prisma.searchHistory.create({ data: { userId, query } })
}
