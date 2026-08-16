export interface ProductSuggestion {
  id: string
  name: string
  slug: string
  image: string | null
}

export interface SearchSuggestionsResponse {
  products: ProductSuggestion[]
  recentSearches: string[]
  popularSearches: string[]
}
