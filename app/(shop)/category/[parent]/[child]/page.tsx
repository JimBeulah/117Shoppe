import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCategoryWithProducts, parseCatalogFilters } from "@/lib/data/catalog"
import { Breadcrumb } from "@/components/catalog/Breadcrumb"
import { SortBar } from "@/components/catalog/SortBar"
import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { Pagination } from "@/components/catalog/Pagination"

export const revalidate = 60

interface Props {
  params: Promise<{ parent: string; child: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { child } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)
  const result = await getCategoryWithProducts(child, "child", filters)
  if (!result) return { title: "Category Not Found | Shoppe" }
  return {
    title: `${result.category.name} | Shoppe`,
    description: `Shop ${result.category.name} — ${result.total.toLocaleString()} products on Shoppe`,
  }
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { parent, child } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)
  const result = await getCategoryWithProducts(child, "child", filters)

  if (!result) notFound()

  const crumbs = [
    { label: "Home", href: "/" },
    ...(result.category.parent
      ? [{ label: result.category.parent.name, href: `/category/${parent}` }]
      : []),
    { label: result.category.name },
  ]

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumb crumbs={crumbs} />
        <h1 className="text-xl font-bold text-text-primary mb-3">{result.category.name}</h1>
        <SortBar total={result.total} currentSort={filters.sort} filters={filters} />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block">
            <FilterSidebar
              currentPriceMin={filters.priceMin}
              currentPriceMax={filters.priceMax}
              currentRating={filters.rating}
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
