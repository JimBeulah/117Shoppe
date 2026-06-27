export interface VariantOption {
  name: string
  values: string[]
}

export interface VariantCellData {
  price: number
  stock: number
  sku: string
  image: string
}

export interface UpsertProductData {
  id?: string
  name: string
  slug: string
  description: string
  categoryId: string
  price: number
  originalPrice?: number
  images: string[]
  stock: number
  variantOptions: VariantOption[] | null
  variants: {
    name: string
    price: number
    stock: number
    sku?: string
    image?: string
  }[]
  isActive: boolean
}

export interface SellerProductRow {
  id: string
  name: string
  price: number
  stock: number
  sold: number
  isActive: boolean
  images: string[]
}

export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  activeProducts: number
  pendingOrders: number
  recentOrders: {
    id: string
    total: number
    status: string
    createdAt: Date
    user: { name: string }
    _count: { items: number }
  }[]
  topProducts: {
    id: string
    name: string
    images: string[]
    sold: number
    stock: number
  }[]
}

export interface CategoryItem {
  id: string
  name: string
  parentId: string | null
}
