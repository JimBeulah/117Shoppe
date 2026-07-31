import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getShopBySlug, getShopProducts, parseCatalogFilters } from "@/lib/data/catalog"
import { getCurrentUser } from "@/lib/data/user"
import { prisma } from "@/lib/db"
import { ShopHeader } from "@/components/shop/ShopHeader"
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
  if (!shop) return { title: "Shop Not Found | Shoppe" }
  return {
    title: `${shop.name} | Shoppe`,
    description: `Shop at ${shop.name} on Shoppe — ${shop._count.products} products available`,
    openGraph: {
      images: shop.logo ? [{ url: shop.logo }] : [],
    },
  }
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)

  const [shop, user] = await Promise.all([
    getShopBySlug(slug),
    getCurrentUser(),
  ])

  if (!shop) notFound()

  const [result, shopFollow] = await Promise.all([
    getShopProducts(shop.id, filters),
    user
      ? prisma.shopFollow.findUnique({
          where: { userId_shopId: { userId: user.id, shopId: shop.id } },
        })
      : Promise.resolve(null),
  ])

  const initialFollowing = shopFollow !== null

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <ShopHeader
          shop={shop}
          initialFollowing={initialFollowing}
          isSignedIn={user !== null}
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
