import { prisma } from "@/lib/db"
import { CategoryBar } from "@/components/layout/CategoryBar"
import { HeroCarousel } from "@/components/home/HeroCarousel"
import { VoucherPanel } from "@/components/home/VoucherPanel"
import { DailyDiscoverPanel } from "@/components/home/DailyDiscoverPanel"
import { FlashSaleSection } from "@/components/home/FlashSaleSection"
import { PromoBannersRow } from "@/components/home/PromoBannersRow"
import { TrendingProductsGrid } from "@/components/home/TrendingProductsGrid"
import { activeFlashSaleItemInclude, getHomeFlashSaleSection, mapFlashSale } from "@/lib/data/flashSale"

export const revalidate = 60

export default async function HomePage() {
  const [categories, banners, vouchers, flashSale, trendingProducts, discoverProducts] = await Promise.all([
    prisma.category.findMany({ where: { parentId: null }, orderBy: { displayOrder: "asc" } }),
    prisma.banner.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.voucher.findMany({ where: { isActive: true, shopId: null, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "asc" }, take: 6 }),
    getHomeFlashSaleSection(10),
    prisma.product.findMany({
      where: { isTrending: true, isActive: true, status: "APPROVED", shop: { isOnVacation: false } },
      include: {
        shop: { select: { name: true, slug: true } },
        flashSaleItems: activeFlashSaleItemInclude(),
      },
      orderBy: { sold: "desc" },
      take: 2,
    }),
    prisma.product.findMany({
      where: { isActive: true, status: "APPROVED", shop: { isOnVacation: false } },
      include: {
        shop: { select: { name: true, slug: true } },
        flashSaleItems: activeFlashSaleItemInclude(),
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ])

  const trendingProductCards = trendingProducts.map(mapFlashSale)
  const discoverProductCards = discoverProducts.map(mapFlashSale)

  return (
    <div className="bg-bg-page">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Hero + Voucher + Trending row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
          <HeroCarousel banners={banners} />
          <div className="flex flex-col gap-2">
            <VoucherPanel vouchers={vouchers} />
            <TrendingProductsGrid products={trendingProductCards} />
          </div>
        </div>

        {/* Flash Sale */}
        {flashSale && (
          <FlashSaleSection products={flashSale.products} endsAt={flashSale.endsAt} />
        )}

        <CategoryBar categories={categories} />

        {/* Promo Banners */}
        <PromoBannersRow />

        {/* Daily Discover */}
        {discoverProductCards.length > 0 && (
          <DailyDiscoverPanel products={discoverProductCards} />
        )}
      </div>
    </div>
  )
}
