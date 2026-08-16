import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/data/user"
import { getProductSuggestions, getRecentSearches, getPopularSearches } from "@/lib/data/search"
import type { SearchSuggestionsResponse } from "@/types/search"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()

  if (q.length >= 2) {
    const products = await getProductSuggestions(q)
    const body: SearchSuggestionsResponse = { products, recentSearches: [], popularSearches: [] }
    return NextResponse.json(body)
  }

  const user = await getCurrentUser()
  const [recentSearches, popularSearches] = await Promise.all([
    user ? getRecentSearches(user.id) : Promise.resolve([]),
    getPopularSearches(),
  ])

  const body: SearchSuggestionsResponse = { products: [], recentSearches, popularSearches }
  return NextResponse.json(body)
}
