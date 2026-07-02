import { prisma } from "@/lib/db"
import { CategoryBar } from "@/components/layout/CategoryBar"
import { HeroCarousel } from "@/components/home/HeroCarousel"
import { VoucherPanel } from "@/components/home/VoucherPanel"
import { DailyDiscoverPanel } from "@/components/home/DailyDiscoverPanel"
import { FlashSaleSection } from "@/components/home/FlashSaleSection"
import { PromoBannersRow } from "@/components/home/PromoBannersRow"
import { TrendingProductsGrid } from "@/components/home/TrendingProductsGrid"

export const revalidate = 60

export default async function HomePage() {
  const [categories, banners, vouchers, flashProducts, trendingProducts, discoverProducts] = await Promise.all([
    prisma.category.findMany({ where: { parentId: null }, orderBy: { displayOrder: "asc" } }),
    prisma.banner.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.voucher.findMany({ where: { isActive: true, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "asc" }, take: 6 }),
    prisma.product.findMany({
      where: { isFlashSale: true, isActive: true },
      include: { shop: { select: { name: true, slug: true } } },
      orderBy: { sold: "desc" },
      take: 10,
    }),
    prisma.product.findMany({
      where: { isTrending: true, isActive: true },
      include: { shop: { select: { name: true, slug: true } } },
      orderBy: { sold: "desc" },
      take: 2,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: { shop: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ])

  const flashSaleEndsAt = flashProducts.find((p) => p.flashSaleEndsAt)?.flashSaleEndsAt ?? new Date(Date.now() + 3600000)

  return (
    <div className="bg-bg-page">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Hero + Voucher + Trending row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
          <HeroCarousel banners={banners} />
          <div className="flex flex-col gap-2">
            <VoucherPanel vouchers={vouchers} />
            <TrendingProductsGrid products={trendingProducts} />
          </div>
        </div>

        {/* Flash Sale */}
        {flashProducts.length > 0 && (
          <FlashSaleSection products={flashProducts} endsAt={flashSaleEndsAt} />
        )}

        <CategoryBar categories={categories} />

        {/* Promo Banners */}
        <PromoBannersRow />

        {/* Daily Discover */}
        {discoverProducts.length > 0 && (
          <DailyDiscoverPanel products={discoverProducts} />
        )}
      </div>
    </div>
  )
}
