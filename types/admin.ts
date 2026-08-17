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
  commissionRate: number
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
  status: string
  rejectionReason: string | null
  createdAt: Date
  shop: { name: string }
  category: { name: string }
}

export interface AdminCategoryRow {
  id: string
  name: string
  slug: string
  icon: string | null
  imageUrl: string | null
  parentId: string | null
  parent: { name: string } | null
  _count: { products: number }
}

export interface AdminBrandRow {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  createdAt: Date
  _count: { products: number }
}

export interface AdminAuditLogRow {
  id: string
  action: string
  targetType: string
  targetId: string | null
  metadata: unknown
  createdAt: Date
  actor: { id: string; name: string; email: string }
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

export interface AdminShippingMethodRow {
  id: string
  name: string
  carrier: string
  description: string | null
  isActive: boolean
  createdAt: Date
}

export interface AdminShippingZoneRow {
  id: string
  name: string
  provinces: string[]
}

export interface AdminShippingRateRow {
  id: string
  methodId: string
  zoneId: string
  price: number
  estimatedDaysMin: number
  estimatedDaysMax: number
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
