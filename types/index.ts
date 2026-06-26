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

export interface CatalogFilters {
  sort: 'best_seller' | 'price_asc' | 'price_desc' | 'newest'
  priceMin: number
  priceMax: number | null
  rating: number | null
  page: number
}

export interface CatalogCategory {
  id: string
  name: string
  slug: string
  icon: string | null
  parent: { id: string; name: string; slug: string } | null
  children: { id: string; name: string; slug: string }[]
}

export interface CatalogResult {
  category: CatalogCategory
  products: ProductCard[]
  total: number
  pageSize: number
}

export interface ProductVariantItem {
  id: string
  name: string
  price: number
  stock: number
  sku: string | null
  image: string | null
}

export interface AddressItem {
  id: string
  fullName: string
  phone: string
  street: string
  city: string
  province: string
  postalCode: string
  isDefault: boolean
}

export interface CartItemWithProduct {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    images: string[]
    stock: number
    shopId: string
  }
  variant: {
    id: string
    name: string
    price: number
    stock: number
  } | null
}

export interface CartGroup {
  shopId: string
  shopName: string
  shopSlug: string
  items: CartItemWithProduct[]
}

export interface OrderConfirmation {
  id: string
  status: string
  total: number
  shippingFee: number
  paymentMethod: string | null
  createdAt: Date
  shop: { name: string; slug: string }
  address: AddressItem
  items: {
    id: string
    quantity: number
    price: number
    product: { name: string; images: string[] }
    variant: { name: string } | null
  }[]
  payment: {
    method: string
    status: string
    amount: number
  } | null
}

export interface ProductDetail {
  id: string
  name: string
  slug: string
  description: string
  price: number
  originalPrice: number | null
  flashSalePrice: number | null
  isFlashSale: boolean
  stock: number
  sold: number
  images: string[]
  rating: number
  reviewCount: number
  variants: ProductVariantItem[]
  category: {
    id: string
    name: string
    slug: string
    parent: { id: string; name: string; slug: string } | null
  }
  shop: {
    id: string
    name: string
    slug: string
    logo: string | null
    rating: number
    followersCount: number
  }
  _count: { reviews: number }
}
