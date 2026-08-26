import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getShopBySlug, getShopProducts, parseCatalogFilters } from "@/lib/data/catalog"
import { ShopHeader } from "@/components/shop/ShopHeader"
import { ShopFollowSlot } from "@/components/shop/ShopFollowSlot"
import { SortBar } from "@/components/catalog/SortBar"
import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { Pagination } from "@/components/catalog/Pagination"

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const shop = await getShopBySlug(slug)
  if (!shop) return { title: "Shop Not Found | 11/7 Shoppe" }
  return {
    title: `${shop.name} | 11/7 Shoppe`,
    description: `Shop at ${shop.name} on 11/7 Shoppe — ${shop._count.products} products available`,
    openGraph: {
      images: shop.logo ? [{ url: shop.logo }] : [],
    },
  }
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)

  const shop = await getShopBySlug(slug)
  if (!shop) notFound()

  const result = await getShopProducts(shop.id, filters)

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <ShopHeader
          shop={shop}
          followSlot={
            <Suspense fallback={<div className="h-8 w-32" />}>
              <ShopFollowSlot shopId={shop.id} shopSlug={shop.slug} initialCount={shop.followersCount} />
            </Suspense>
          }
        />

        <SortBar
          total={result.total}
          currentSort={filters.sort}
          filters={filters}
        />

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
