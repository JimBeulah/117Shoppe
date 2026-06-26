import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductBySlug } from "@/lib/data/catalog"
import { Breadcrumb } from "@/components/catalog/Breadcrumb"
import { ImageGallery } from "@/components/product/ImageGallery"
import { ProductInteractivePanel } from "@/components/product/ProductInteractivePanel"
import { ShopPanel } from "@/components/product/ShopPanel"
import { formatSold } from "@/lib/utils"

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: "Product Not Found | Eshopee" }
  return {
    title: `${product.name} | Eshopee`,
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
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumb crumbs={crumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 mt-2">
          {/* Left: image gallery */}
          <ImageGallery images={product.images} productName={product.name} />

          {/* Right: info panel */}
          <div className="space-y-5">
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
            />

            <ShopPanel shop={product.shop} />

            {/* Description */}
            <div>
              <h2 className="text-sm font-semibold text-text-primary mb-2">Product Description</h2>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
