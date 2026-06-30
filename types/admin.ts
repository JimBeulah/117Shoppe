export interface AdminDashboardStats {
  totalUsers: number
  totalShops: number
  activeShops: number
  pendingShops: number
  rejectedShops: number
  totalOrders: number
  todayOrders: number
  totalRevenue: number
  recentOrders: {
    id: string
    total: number
    status: string
    createdAt: Date
    user: { name: string }
    shop: { name: string }
  }[]
  pendingShopApplications: {
    id: string
    name: string
    createdAt: Date
    owner: { email: string }
  }[]
}

export interface AdminShopRow {
  id: string
  name: string
  status: string
  createdAt: Date
  rejectionReason: string | null
  owner: { email: string }
}

export interface AdminUserRow {
  id: string
  name: string
  email: string
  role: string
  isBanned: boolean
  clerkId: string
  createdAt: Date
}

export interface AdminOrderRow {
  id: string
  total: number
  status: string
  createdAt: Date
  user: { name: string }
  shop: { name: string }
}

export interface AdminProductRow {
  id: string
  name: string
  price: number
  stock: number
  isActive: boolean
  createdAt: Date
  shop: { name: string }
  category: { name: string }
}

export interface AdminCategoryRow {
  id: string
  name: string
  slug: string
  icon: string | null
  parentId: string | null
  parent: { name: string } | null
  _count: { products: number }
}

export interface AdminBannerRow {
  id: string
  imageUrl: string
  title: string | null
  linkUrl: string | null
  displayOrder: number
  isActive: boolean
  createdAt: Date
}

export interface AdminVoucherRow {
  id: string
  code: string
  title: string
  discountType: string
  discountValue: number
  minSpend: number
  maxDiscount: number | null
  usageLimit: number | null
  expiresAt: Date
  isActive: boolean
}

export interface AdminFlashSaleRow {
  id: string
  title: string
  startsAt: Date
  endsAt: Date
  isActive: boolean
  _count: { items: number }
}
