import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductBySlug } from "@/lib/data/catalog"
import { Breadcrumb } from "@/components/catalog/Breadcrumb"
import { ImageGallery } from "@/components/product/ImageGallery"
import { ProductInteractivePanel } from "@/components/product/ProductInteractivePanel"
import { ShopPanel } from "@/components/product/ShopPanel"
import { ReviewsSection } from "@/components/product/ReviewsSection"
import { formatSold } from "@/lib/utils"

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: "Product Not Found | 11/7 Shoppe" }
  return {
    title: `${product.name} | 11/7 Shoppe`,
    description: product.description.slice(0, 160),
    openGraph: {
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) notFound()

  const crumbs = [
    { label: "Home", href: "/" },
    ...(product.category.parent
      ? [
          {
            label: product.category.parent.name,
            href: `/category/${product.category.parent.slug}`,
          },
          {
            label: product.category.name,
            href: `/category/${product.category.parent.slug}/${product.category.slug}`,
          },
        ]
      : [{ label: product.category.name, href: `/category/${product.category.slug}` }]),
    { label: product.name },
  ]

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
        <div className="bg-bg-surface px-2">
          <Breadcrumb crumbs={crumbs} />
        </div>

        {/* Top: gallery + buy panel */}
        <div className="bg-bg-surface p-6 grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-8">
          {/* Left: image gallery */}
          <ImageGallery images={product.images} productName={product.name} />

          {/* Right: info panel */}
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-text-primary leading-snug">{product.name}</h1>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary">
                <span className="flex items-center gap-0.5">
                  <span className="text-reward">★</span> {product.rating.toFixed(1)}
                </span>
                <span>{product._count.reviews} reviews</span>
                <span>{formatSold(product.sold)}</span>
              </div>
            </div>

            <ProductInteractivePanel
              productId={product.id}
              basePrice={product.price}
              originalPrice={product.originalPrice}
              flashSalePrice={product.flashSalePrice}
              isFlashSale={product.isFlashSale}
              baseStock={product.stock}
              variants={product.variants}
              isShopOnVacation={product.shop.isOnVacation}
              vacationMessage={product.shop.vacationMessage}
            />
          </div>
        </div>

        {/* Shop bar */}
        <div className="bg-bg-surface p-4">
          <ShopPanel shop={product.shop} />
        </div>

        {/* Description */}
        <div className="bg-bg-surface p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">Product Description</h2>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>

        {/* Reviews */}
        <div className="bg-bg-surface p-6">
          <ReviewsSection
            productId={product.id}
            productSlug={product.slug}
            productRating={product.rating}
            productReviewCount={product.reviewCount}
          />
        </div>
      </div>
    </div>
  )
}
