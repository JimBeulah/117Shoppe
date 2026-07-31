import type { Metadata } from "next"
import { parseCatalogFilters, searchProducts, getParentCategories } from "@/lib/data/catalog"
import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import { SortBar } from "@/components/catalog/SortBar"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { Pagination } from "@/components/catalog/Pagination"

export const revalidate = 0

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const q = typeof sp.q === "string" ? sp.q : ""
  return {
    title: q ? `"${q}" — Search Results | 11/7 Shoppe` : "Search Products | 11/7 Shoppe",
    description: q
      ? `Find "${q}" on 11/7 Shoppe — Philippines' favourite online shop`
      : "Search millions of products on 11/7 Shoppe",
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)

  const [result, categories] = await Promise.all([
    searchProducts(filters),
    getParentCategories(),
  ])

  const heading = filters.q ? `Results for "${filters.q}"` : "All Products"

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-text-primary mb-0.5">{heading}</h1>
        <p className="text-sm text-text-secondary mb-3">
          {result.total.toLocaleString()} {result.total === 1 ? "product" : "products"} found
        </p>

        <SortBar
          total={result.total}
          currentSort={filters.sort}
          filters={filters}
          categories={categories}
        />

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block">
            <FilterSidebar
              currentPriceMin={filters.priceMin}
              currentPriceMax={filters.priceMax}
              currentRating={filters.rating}
              categories={categories}
              currentCategory={filters.category}
            />
          </div>
          <div>
            <ProductGrid products={result.products} />
            <Pagination
              total={result.total}
              pageSize={result.pageSize}
              currentPage={filters.page}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
