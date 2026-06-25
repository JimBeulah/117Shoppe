export interface ProductCard {
  id: string
  name: string
  slug: string
  price: number
  originalPrice: number | null
  flashSalePrice: number | null
  flashSaleEndsAt: Date | null
  isFlashSale: boolean
  images: string[]
  rating: number
  reviewCount: number
  sold: number
  shop: {
    name: string
    slug: string
  }
}

export interface CategoryItem {
  id: string
  name: string
  slug: string
  icon: string | null
}

export interface BannerItem {
  id: string
  imageUrl: string
  linkUrl: string | null
  title: string | null
  displayOrder: number
}

export interface VoucherItem {
  id: string
  code: string
  title: string
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  minSpend: number
  maxDiscount: number | null
  expiresAt: Date
}
