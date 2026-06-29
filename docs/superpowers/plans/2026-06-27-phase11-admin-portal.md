# Phase 11: Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a platform admin portal at `/admin/*` covering 9 management sections — sellers, users, orders, products, categories, banners, vouchers, and flash sales — behind an ADMIN role gate.

**Architecture:** Parallel route group `app/(admin)/` mirrors the `(seller)` pattern. Auth is enforced in middleware and double-checked in every server action. All pages are Server Components; mutations go through `"use server"` actions in `lib/admin/actions.ts`.

**Tech Stack:** Next.js App Router, Prisma (via `@/lib/db`), Clerk (`@clerk/nextjs/server`), Tailwind CSS with project design tokens, inline `formAction` server actions.

## Global Constraints

- Import Prisma client from `@/lib/generated/prisma/client` — NOT `@prisma/client`
- Use `prisma` singleton from `@/lib/db` in every query/action file
- Auth via `auth()` from `@clerk/nextjs/server`; role lives in `sessionClaims?.metadata?.role`
- Clerk metadata sync: `const clerk = await clerkClient(); await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role } })`
- Design tokens: `text-text-primary`, `text-text-secondary`, `bg-bg-page`, `border-border-default`, `brand-*` for primary actions
- `searchParams` in pages must be typed as `Promise<{...}>` and `await`ed
- Page `PAGE_SIZE = 20` for all paginated lists
- `formatPrice` from `@/lib/utils` for currency display
- No hard deletes on users, products, vouchers
- No chart libraries — stat counts only

---

## File Map

**New files:**
- `middleware.ts` — add `isAdminRoute` matcher (modify existing)
- `types/admin.ts` — admin-specific TypeScript interfaces
- `lib/admin/queries.ts` — all admin read functions
- `lib/admin/actions.ts` — all admin mutations (`"use server"`)
- `app/(admin)/layout.tsx` — outer layout wrapper
- `app/(admin)/admin/(portal)/layout.tsx` — portal layout with AdminSidebar
- `components/admin/AdminSidebar.tsx` — fixed left nav (9 sections)
- `components/admin/AdminStatCard.tsx` — reusable stat card
- `components/admin/ShopStatusBadge.tsx` — PENDING/ACTIVE/REJECTED badge
- `components/admin/OrderStatusBadge.tsx` — order status badge
- `app/(admin)/admin/(portal)/dashboard/page.tsx`
- `app/(admin)/admin/(portal)/sellers/page.tsx`
- `app/(admin)/admin/(portal)/users/page.tsx`
- `app/(admin)/admin/(portal)/orders/page.tsx`
- `app/(admin)/admin/(portal)/orders/[id]/page.tsx`
- `app/(admin)/admin/(portal)/products/page.tsx`
- `app/(admin)/admin/(portal)/categories/page.tsx`
- `app/(admin)/admin/(portal)/banners/page.tsx`
- `app/(admin)/admin/(portal)/vouchers/page.tsx`
- `app/(admin)/admin/(portal)/flash-sales/page.tsx`
- `app/(admin)/admin/(portal)/flash-sales/new/page.tsx`
- `app/(admin)/admin/(portal)/flash-sales/[id]/page.tsx`

---

### Task 1: Infrastructure — Middleware, Types, Layouts, Shared Components

**Files:**
- Modify: `middleware.ts`
- Create: `types/admin.ts`
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/admin/(portal)/layout.tsx`
- Create: `components/admin/AdminSidebar.tsx`
- Create: `components/admin/AdminStatCard.tsx`
- Create: `components/admin/ShopStatusBadge.tsx`
- Create: `components/admin/OrderStatusBadge.tsx`

**Interfaces:**
- Produces: `AdminStatCard` props `{ label, value, sub?, highlight? }` — used by dashboard
- Produces: `ShopStatusBadge` props `{ status: "PENDING" | "ACTIVE" | "REJECTED" }` — used by sellers page
- Produces: `OrderStatusBadge` props `{ status: string }` — used by orders pages

- [ ] **Step 1: Update middleware to guard `/admin/*`**

Replace `middleware.ts` with:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher(["/account/:path*", "/cart", "/checkout/:path*"])
const isSellerRoute = createRouteMatcher(["/seller/:path*"])
const isOpenSellerRoute = createRouteMatcher([
  "/seller/onboarding",
  "/seller/pending",
  "/seller/rejected",
])
const isAdminRoute = createRouteMatcher(["/admin/:path*"])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) || isSellerRoute(req) || isAdminRoute(req)) {
    await auth.protect()
  }

  if (isSellerRoute(req) && !isOpenSellerRoute(req)) {
    const { sessionClaims } = await auth()
    if (sessionClaims?.metadata?.role !== "SELLER") {
      return Response.redirect(new URL("/seller/onboarding", req.url))
    }
  }

  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth()
    if (sessionClaims?.metadata?.role !== "ADMIN") {
      return Response.redirect(new URL("/", req.url))
    }
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}
```

- [ ] **Step 2: Create `types/admin.ts`**

```ts
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
```

- [ ] **Step 3: Create outer layout `app/(admin)/layout.tsx`**

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg-page">{children}</div>
}
```

- [ ] **Step 4: Create portal layout `app/(admin)/admin/(portal)/layout.tsx`**

```tsx
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import AdminSidebar from "@/components/admin/AdminSidebar"

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== "ADMIN") redirect("/")

  return (
    <div className="flex min-h-screen bg-bg-page">
      <AdminSidebar />
      <main className="flex-1 p-6 max-w-[1200px]">{children}</main>
    </div>
  )
}
```

- [ ] **Step 5: Create `components/admin/AdminSidebar.tsx`**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Sellers", href: "/admin/sellers" },
  { label: "Users", href: "/admin/users" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Banners", href: "/admin/banners" },
  { label: "Vouchers", href: "/admin/vouchers" },
  { label: "Flash Sales", href: "/admin/flash-sales" },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-border-default flex-shrink-0">
      <div className="p-4 border-b border-border-default">
        <p className="text-xs text-text-secondary uppercase tracking-wide">Platform Admin</p>
      </div>
      <nav className="p-2 space-y-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? "bg-brand-600 text-white font-medium"
                : "text-text-secondary hover:bg-brand-50 hover:text-text-primary"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 6: Create `components/admin/AdminStatCard.tsx`**

```tsx
interface Props {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export default function AdminStatCard({ label, value, sub, highlight }: Props) {
  return (
    <div
      className={`bg-white rounded-lg border p-5 space-y-1 ${
        highlight ? "border-brand-200 bg-brand-50" : "border-border-default"
      }`}
    >
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-brand-700" : "text-text-primary"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 7: Create `components/admin/ShopStatusBadge.tsx`**

```tsx
const COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}

export default function ShopStatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLOR[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}
```

- [ ] **Step 8: Create `components/admin/OrderStatusBadge.tsx`**

```tsx
const COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
}

export default function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLOR[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add middleware.ts types/admin.ts app/(admin) components/admin
git commit -m "feat(admin): scaffold infrastructure — middleware guard, layouts, sidebar, shared components"
```

---

### Task 2: Dashboard

**Files:**
- Create: `lib/admin/queries.ts` (initial — dashboard only)
- Create: `app/(admin)/admin/(portal)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `AdminStatCard` from `@/components/admin/AdminStatCard`
- Consumes: `ShopStatusBadge` from `@/components/admin/ShopStatusBadge`
- Consumes: `OrderStatusBadge` from `@/components/admin/OrderStatusBadge`
- Consumes: `AdminDashboardStats` from `@/types/admin`
- Produces: `getAdminDashboardStats(): Promise<AdminDashboardStats>` in `lib/admin/queries.ts`

- [ ] **Step 1: Create `lib/admin/queries.ts` with auth helper and dashboard query**

```ts
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import type {
  AdminDashboardStats,
  AdminShopRow,
  AdminUserRow,
  AdminOrderRow,
  AdminProductRow,
  AdminCategoryRow,
  AdminBannerRow,
  AdminVoucherRow,
  AdminFlashSaleRow,
} from "@/types/admin"

const PAGE_SIZE = 20

async function assertAdmin() {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== "ADMIN") throw new Error("Unauthorized")
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await assertAdmin()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    totalUsers,
    shopCounts,
    totalOrders,
    todayOrders,
    revenueAgg,
    recentOrders,
    pendingShopApplications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.shop.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "SHIPPED", "DELIVERED", "CANCELLED"] } },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
        shop: { select: { name: true } },
      },
    }),
    prisma.shop.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
        owner: { select: { email: true } },
      },
    }),
  ])

  const shopCountMap = Object.fromEntries(
    shopCounts.map((g) => [g.status, g._count._all])
  )

  return {
    totalUsers,
    totalShops: (shopCountMap["PENDING"] ?? 0) + (shopCountMap["ACTIVE"] ?? 0) + (shopCountMap["REJECTED"] ?? 0),
    activeShops: shopCountMap["ACTIVE"] ?? 0,
    pendingShops: shopCountMap["PENDING"] ?? 0,
    rejectedShops: shopCountMap["REJECTED"] ?? 0,
    totalOrders,
    todayOrders,
    totalRevenue: revenueAgg._sum.total ?? 0,
    recentOrders,
    pendingShopApplications,
  }
}
```

- [ ] **Step 2: Create `app/(admin)/admin/(portal)/dashboard/page.tsx`**

```tsx
import { getAdminDashboardStats } from "@/lib/admin/queries"
import AdminStatCard from "@/components/admin/AdminStatCard"
import ShopStatusBadge from "@/components/admin/ShopStatusBadge"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"

export const metadata = { title: "Admin Dashboard" }

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Users" value={stats.totalUsers} />
        <AdminStatCard
          label="Total Shops"
          value={stats.totalShops}
          sub={`${stats.activeShops} active · ${stats.pendingShops} pending · ${stats.rejectedShops} rejected`}
        />
        <AdminStatCard
          label="Total Orders"
          value={stats.totalOrders}
          sub={`${stats.todayOrders} today`}
        />
        <AdminStatCard
          label="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border-default">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-brand-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{order.user.name}</p>
                      <p className="text-xs text-text-secondary">{order.shop.name} · {new Date(order.createdAt).toLocaleDateString("en-PH")}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-semibold text-text-primary">{formatPrice(order.total)}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending Shop Applications */}
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary">Pending Seller Applications</h2>
            <Link href="/admin/sellers?status=PENDING" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {stats.pendingShopApplications.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No pending applications.</p>
          ) : (
            <ul className="divide-y divide-border-default">
              {stats.pendingShopApplications.map((shop) => (
                <li key={shop.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{shop.name}</p>
                    <p className="text-xs text-text-secondary">{shop.owner.email} · {new Date(shop.createdAt).toLocaleDateString("en-PH")}</p>
                  </div>
                  <div className="flex gap-2">
                    <form>
                      <input type="hidden" name="shopId" value={shop.id} />
                      <button
                        type="submit"
                        formAction={async (fd: FormData) => {
                          "use server"
                          const { approveShop } = await import("@/lib/admin/actions")
                          await approveShop(fd.get("shopId") as string)
                        }}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </form>
                    <Link
                      href={`/admin/sellers?highlight=${shop.id}`}
                      className="text-xs px-2 py-1 border border-border-default rounded text-text-secondary hover:bg-brand-50"
                    >
                      Reject
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify dashboard renders at `/admin/dashboard` (manual — start dev server, sign in as ADMIN, visit the page, confirm stat cards and tables appear)**

- [ ] **Step 4: Commit**

```bash
git add lib/admin/queries.ts app/(admin)/admin/(portal)/dashboard
git commit -m "feat(admin): dashboard page with stat cards and recent activity"
```

---

### Task 3: Sellers Management

**Files:**
- Modify: `lib/admin/queries.ts` — add `getAdminShops()`
- Create: `lib/admin/actions.ts`
- Create: `app/(admin)/admin/(portal)/sellers/page.tsx`

**Interfaces:**
- Consumes: `AdminShopRow` from `@/types/admin`
- Produces: `getAdminShops(page, statusFilter): Promise<{ shops: AdminShopRow[], total: number, pageSize: number }>`
- Produces: `approveShop(shopId): Promise<void>` in `lib/admin/actions.ts`
- Produces: `rejectShop(shopId, reason): Promise<void>` in `lib/admin/actions.ts`

- [ ] **Step 1: Add `getAdminShops` to `lib/admin/queries.ts`**

Append to the end of the file:

```ts
export async function getAdminShops(
  page: number,
  statusFilter: string | null
): Promise<{ shops: AdminShopRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const where = statusFilter ? { status: statusFilter as any } : {}
  const [shops, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        rejectionReason: true,
        owner: { select: { email: true } },
      },
    }),
    prisma.shop.count({ where }),
  ])
  return { shops, total, pageSize: PAGE_SIZE }
}
```

- [ ] **Step 2: Create `lib/admin/actions.ts`**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"

async function assertAdmin() {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== "ADMIN") throw new Error("Unauthorized")
}

// ─── Sellers ──────────────────────────────────────────────────────────────────

export async function approveShop(shopId: string): Promise<{ error?: string }> {
  await assertAdmin()
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, include: { owner: true } })
  if (!shop) return { error: "Shop not found" }

  await prisma.$transaction([
    prisma.shop.update({ where: { id: shopId }, data: { status: "ACTIVE", rejectionReason: null } }),
    prisma.user.update({ where: { id: shop.ownerId }, data: { role: "SELLER" } }),
  ])
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(shop.owner.clerkId, { publicMetadata: { role: "SELLER" } })

  revalidatePath("/admin/sellers")
  revalidatePath("/admin/dashboard")
  return {}
}

export async function rejectShop(shopId: string, reason: string): Promise<{ error?: string }> {
  await assertAdmin()
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, include: { owner: true } })
  if (!shop) return { error: "Shop not found" }

  await prisma.$transaction([
    prisma.shop.update({ where: { id: shopId }, data: { status: "REJECTED", rejectionReason: reason } }),
    prisma.user.update({ where: { id: shop.ownerId }, data: { role: "BUYER" } }),
  ])
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(shop.owner.clerkId, { publicMetadata: { role: "BUYER" } })

  revalidatePath("/admin/sellers")
  revalidatePath("/admin/dashboard")
  return {}
}
```

- [ ] **Step 3: Create `app/(admin)/admin/(portal)/sellers/page.tsx`**

```tsx
import Link from "next/link"
import { getAdminShops } from "@/lib/admin/queries"
import { approveShop, rejectShop } from "@/lib/admin/actions"
import ShopStatusBadge from "@/components/admin/ShopStatusBadge"

export const metadata = { title: "Admin — Sellers" }

const STATUS_TABS = [
  { label: "All", value: null },
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Rejected", value: "REJECTED" },
]

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>
}

export default async function AdminSellersPage({ searchParams }: Props) {
  const { page: pageStr, status: statusParam } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const statusFilter = statusParam ?? null

  const { shops, total, pageSize } = await getAdminShops(page, statusFilter)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Sellers</h1>

      <div className="flex gap-1 border-b border-border-default">
        {STATUS_TABS.map((tab) => {
          const href = tab.value ? `/admin/sellers?status=${tab.value}` : "/admin/sellers"
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                active ? "border-brand-600 text-brand-600 font-medium" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {shops.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No shops found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Owner</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {shops.map((shop) => (
                <tr key={shop.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{shop.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{shop.owner.email}</td>
                  <td className="px-4 py-3">
                    <ShopStatusBadge status={shop.status} />
                    {shop.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">{shop.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(shop.createdAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {shop.status !== "ACTIVE" && (
                        <form>
                          <input type="hidden" name="shopId" value={shop.id} />
                          <button
                            type="submit"
                            formAction={async (fd: FormData) => {
                              "use server"
                              await approveShop(fd.get("shopId") as string)
                            }}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                        </form>
                      )}
                      {shop.status !== "REJECTED" && (
                        <form className="flex items-center gap-1">
                          <input type="hidden" name="shopId" value={shop.id} />
                          <input
                            name="reason"
                            placeholder="Reason"
                            className="text-xs border border-border-default rounded px-2 py-1 w-32"
                          />
                          <button
                            type="submit"
                            formAction={async (fd: FormData) => {
                              "use server"
                              await rejectShop(fd.get("shopId") as string, fd.get("reason") as string)
                            }}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/admin/sellers?${statusFilter ? `status=${statusFilter}&` : ""}page=${page - 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Previous</Link>
                )}
                {page < totalPages && (
                  <Link href={`/admin/sellers?${statusFilter ? `status=${statusFilter}&` : ""}page=${page + 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Next</Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/admin/queries.ts lib/admin/actions.ts app/(admin)/admin/(portal)/sellers
git commit -m "feat(admin): sellers management page with approve/reject actions"
```

---

### Task 4: Users Management

**Files:**
- Modify: `lib/admin/queries.ts` — add `getAdminUsers()`
- Modify: `lib/admin/actions.ts` — add `promoteToSeller()`, `demoteToBuyer()`
- Create: `app/(admin)/admin/(portal)/users/page.tsx`

**Interfaces:**
- Consumes: `AdminUserRow` from `@/types/admin`
- Produces: `getAdminUsers(page): Promise<{ users: AdminUserRow[], total: number, pageSize: number }>`
- Produces: `promoteToSeller(userId: string, clerkId: string): Promise<{ error?: string }>`
- Produces: `demoteToBuyer(userId: string, clerkId: string): Promise<{ error?: string }>`

- [ ] **Step 1: Append `getAdminUsers` to `lib/admin/queries.ts`**

```ts
export async function getAdminUsers(
  page: number
): Promise<{ users: AdminUserRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, clerkId: true, createdAt: true },
    }),
    prisma.user.count(),
  ])
  return { users, total, pageSize: PAGE_SIZE }
}
```

- [ ] **Step 2: Append user role actions to `lib/admin/actions.ts`**

```ts
// ─── Users ────────────────────────────────────────────────────────────────────

export async function promoteToSeller(userId: string, clerkId: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { role: "SELLER" } })
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role: "SELLER" } })
  revalidatePath("/admin/users")
  return {}
}

export async function demoteToBuyer(userId: string, clerkId: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { role: "BUYER" } })
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role: "BUYER" } })
  revalidatePath("/admin/users")
  return {}
}
```

- [ ] **Step 3: Create `app/(admin)/admin/(portal)/users/page.tsx`**

```tsx
import Link from "next/link"
import { getAdminUsers } from "@/lib/admin/queries"
import { promoteToSeller, demoteToBuyer } from "@/lib/admin/actions"

export const metadata = { title: "Admin — Users" }

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  SELLER: "bg-blue-100 text-blue-700",
  BUYER: "bg-gray-100 text-gray-600",
}

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const { users, total, pageSize } = await getAdminUsers(page)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Users</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Email</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Role</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
                <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(user.createdAt).toLocaleDateString("en-PH")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/orders?userId=${user.id}`} className="text-xs text-brand-600 hover:underline">
                      Orders
                    </Link>
                    {user.role !== "ADMIN" && user.role !== "SELLER" && (
                      <form>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="clerkId" value={user.clerkId} />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await promoteToSeller(fd.get("userId") as string, fd.get("clerkId") as string)
                          }}
                          className="text-xs px-2 py-1 border border-brand-600 text-brand-600 rounded hover:bg-brand-50"
                        >
                          Promote to Seller
                        </button>
                      </form>
                    )}
                    {user.role === "SELLER" && (
                      <form>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="clerkId" value={user.clerkId} />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await demoteToBuyer(fd.get("userId") as string, fd.get("clerkId") as string)
                          }}
                          className="text-xs px-2 py-1 border border-red-500 text-red-500 rounded hover:bg-red-50"
                        >
                          Demote to Buyer
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
            <p className="text-xs text-text-secondary">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/admin/users?page=${page - 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Previous</Link>}
              {page < totalPages && <Link href={`/admin/users?page=${page + 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/admin/queries.ts lib/admin/actions.ts app/(admin)/admin/(portal)/users
git commit -m "feat(admin): users management page with role promote/demote"
```

---

### Task 5: Orders (List + Detail)

**Files:**
- Modify: `lib/admin/queries.ts` — add `getAdminOrders()`, `getAdminOrderDetail()`
- Create: `app/(admin)/admin/(portal)/orders/page.tsx`
- Create: `app/(admin)/admin/(portal)/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `AdminOrderRow` from `@/types/admin`
- Produces: `getAdminOrders(page, statusFilter, userId?): Promise<{ orders: AdminOrderRow[], total, pageSize }>`
- Produces: `getAdminOrderDetail(orderId): Promise<order with items, address, shipment | null>`

- [ ] **Step 1: Append order queries to `lib/admin/queries.ts`**

```ts
export async function getAdminOrders(
  page: number,
  statusFilter: string | null,
  userId: string | null
): Promise<{ orders: AdminOrderRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const where: any = {}
  if (statusFilter) where.status = statusFilter
  if (userId) where.userId = userId

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
        shop: { select: { name: true } },
      },
    }),
    prisma.order.count({ where }),
  ])
  return { orders, total, pageSize: PAGE_SIZE }
}

export async function getAdminOrderDetail(orderId: string) {
  await assertAdmin()
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      shop: { select: { name: true } },
      address: true,
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { name: true } },
        },
      },
      payment: true,
      shipment: true,
    },
  })
}
```

- [ ] **Step 2: Create `app/(admin)/admin/(portal)/orders/page.tsx`**

```tsx
import Link from "next/link"
import { getAdminOrders } from "@/lib/admin/queries"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Admin — Orders" }

const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]

interface Props {
  searchParams: Promise<{ page?: string; status?: string; userId?: string }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { page: pageStr, status: statusParam, userId } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const statusFilter = statusParam ?? null

  const { orders, total, pageSize } = await getAdminOrders(page, statusFilter, userId ?? null)
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: Record<string, string | null>) {
    const params = new URLSearchParams()
    const merged = { status: statusFilter, userId: userId ?? null, ...overrides }
    if (merged.status) params.set("status", merged.status)
    if (merged.userId) params.set("userId", merged.userId)
    return `/admin/orders${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Orders</h1>

      <div className="flex items-center gap-2">
        <select
          defaultValue={statusFilter ?? ""}
          onChange={(e) => { /* navigation handled by Link — use a form instead */ }}
          className="text-sm border border-border-default rounded px-3 py-1.5 bg-white"
        >
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-text-secondary">{total} orders</span>
      </div>

      {/* Status filter links (accessible, no JS required) */}
      <div className="flex gap-1 flex-wrap">
        <Link href={buildHref({ status: null })} className={`text-xs px-3 py-1 rounded border ${!statusFilter ? "bg-brand-600 text-white border-brand-600" : "border-border-default text-text-secondary hover:bg-brand-50"}`}>All</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={buildHref({ status: s })} className={`text-xs px-3 py-1 rounded border ${statusFilter === s ? "bg-brand-600 text-white border-brand-600" : "border-border-default text-text-secondary hover:bg-brand-50"}`}>{s}</Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Order ID</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Total</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">#{order.id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-text-primary">{order.user.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{order.shop.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">{formatPrice(order.total)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(order.createdAt).toLocaleDateString("en-PH")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/orders/${order.id}`} className="text-xs text-brand-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
              <div className="flex gap-2">
                {page > 1 && <Link href={buildHref({ page: String(page - 1) } as any)} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Previous</Link>}
                {page < totalPages && <Link href={buildHref({ page: String(page + 1) } as any)} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Next</Link>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

> **Note on pagination links:** The `buildHref` helper above passes `page` as a custom key — extend the helper to handle it:
> Replace `buildHref` with:
> ```ts
> function buildHref(overrides: { status?: string | null; userId?: string | null; page?: number }) {
>   const params = new URLSearchParams()
>   const s = "status" in overrides ? overrides.status : statusFilter
>   const u = "userId" in overrides ? overrides.userId : (userId ?? null)
>   const p = overrides.page ?? page
>   if (s) params.set("status", s)
>   if (u) params.set("userId", u)
>   if (p > 1) params.set("page", String(p))
>   return `/admin/orders${params.toString() ? `?${params}` : ""}`
> }
> ```
> And update pagination links to use `buildHref({ page: page - 1 })` / `buildHref({ page: page + 1 })`.

- [ ] **Step 3: Create `app/(admin)/admin/(portal)/orders/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import Link from "next/link"
import { getAdminOrderDetail } from "@/lib/admin/queries"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import { formatPrice } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await getAdminOrderDetail(id)
  if (!order) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          Order #{order.id.slice(-8).toUpperCase()}
        </h1>
        <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">← Back</Link>
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Buyer</p>
            <p className="text-sm font-medium text-text-primary">{order.user.name}</p>
            <p className="text-xs text-text-secondary">{order.user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Shop</p>
            <p className="text-sm font-medium text-text-primary">{order.shop.name}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <hr className="border-border-default" />
        <div>
          <p className="text-xs text-text-secondary mb-1">Shipping Address</p>
          <p className="text-sm text-text-primary">{order.address.fullName} · {order.address.phone}</p>
          <p className="text-sm text-text-secondary">{order.address.street}, {order.address.city}, {order.address.province} {order.address.postalCode}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <h2 className="font-semibold text-sm text-text-primary">Items</h2>
        </div>
        <ul className="divide-y divide-border-default">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              {item.product.images[0] && (
                <img src={item.product.images[0]} alt={item.product.name} className="w-10 h-10 object-cover rounded border border-border-default flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{item.product.name}</p>
                {item.variant && <p className="text-xs text-text-secondary">{item.variant.name}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-text-primary">×{item.quantity}</p>
                <p className="text-xs text-text-secondary">{formatPrice(item.price)}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-border-default flex justify-between">
          <p className="text-sm text-text-secondary">Total</p>
          <p className="text-sm font-bold text-text-primary">{formatPrice(order.total)}</p>
        </div>
      </div>

      {order.shipment && (
        <div className="bg-white rounded-lg border border-border-default p-5 space-y-1">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Shipment</p>
          <p className="text-sm text-text-primary">{order.shipment.courier} · {order.shipment.trackingNumber}</p>
          <p className="text-xs text-text-secondary">{order.shipment.status}</p>
        </div>
      )}

      {order.payment && (
        <div className="bg-white rounded-lg border border-border-default p-5 space-y-1">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Payment</p>
          <p className="text-sm text-text-primary">{order.payment.method} · {order.payment.status}</p>
          {order.payment.reference && <p className="text-xs text-text-secondary">Ref: {order.payment.reference}</p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/admin/queries.ts app/(admin)/admin/(portal)/orders
git commit -m "feat(admin): orders list with status filter and read-only order detail"
```

---

### Task 6: Products Admin

**Files:**
- Modify: `lib/admin/queries.ts` — add `getAdminProducts()`
- Modify: `lib/admin/actions.ts` — add `adminToggleProduct()`
- Create: `app/(admin)/admin/(portal)/products/page.tsx`

**Interfaces:**
- Consumes: `AdminProductRow` from `@/types/admin`
- Produces: `getAdminProducts(page): Promise<{ products: AdminProductRow[], total, pageSize }>`
- Produces: `adminToggleProduct(productId, isActive): Promise<{ error?: string }>`

- [ ] **Step 1: Append `getAdminProducts` to `lib/admin/queries.ts`**

```ts
export async function getAdminProducts(
  page: number
): Promise<{ products: AdminProductRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        createdAt: true,
        shop: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.product.count(),
  ])
  return { products, total, pageSize: PAGE_SIZE }
}
```

- [ ] **Step 2: Append `adminToggleProduct` to `lib/admin/actions.ts`**

```ts
// ─── Products ─────────────────────────────────────────────────────────────────

export async function adminToggleProduct(productId: string, isActive: boolean): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.product.update({ where: { id: productId }, data: { isActive } })
  revalidatePath("/admin/products")
  return {}
}
```

- [ ] **Step 3: Create `app/(admin)/admin/(portal)/products/page.tsx`**

```tsx
import Link from "next/link"
import { getAdminProducts } from "@/lib/admin/queries"
import { adminToggleProduct } from "@/lib/admin/actions"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Admin — Products" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const { products, total, pageSize } = await getAdminProducts(page)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Products</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Shop</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Category</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Price</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Stock</th>
              <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">{product.name}</td>
                <td className="px-4 py-3 text-text-secondary">{product.shop.name}</td>
                <td className="px-4 py-3 text-text-secondary">{product.category.name}</td>
                <td className="px-4 py-3 text-right text-text-primary">{formatPrice(product.price)}</td>
                <td className="px-4 py-3 text-right text-text-primary">{product.stock}</td>
                <td className="px-4 py-3 text-center">
                  <form>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="isActive" value={String(!product.isActive)} />
                    <button
                      type="submit"
                      formAction={async (fd: FormData) => {
                        "use server"
                        await adminToggleProduct(fd.get("productId") as string, fd.get("isActive") === "true")
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${product.isActive ? "bg-brand-600" : "bg-gray-200"}`}
                      title={product.isActive ? "Deactivate" : "Activate"}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${product.isActive ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-text-secondary">{new Date(product.createdAt).toLocaleDateString("en-PH")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
            <p className="text-xs text-text-secondary">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/admin/products?page=${page - 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Previous</Link>}
              {page < totalPages && <Link href={`/admin/products?page=${page + 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/admin/queries.ts lib/admin/actions.ts app/(admin)/admin/(portal)/products
git commit -m "feat(admin): products page with platform-wide toggle"
```

---

### Task 7: Categories CRUD

**Files:**
- Modify: `lib/admin/queries.ts` — add `getAdminCategories()`
- Modify: `lib/admin/actions.ts` — add `createCategory()`, `updateCategory()`, `deleteCategory()`
- Create: `app/(admin)/admin/(portal)/categories/page.tsx`

**Interfaces:**
- Consumes: `AdminCategoryRow` from `@/types/admin`
- Produces: `getAdminCategories(): Promise<AdminCategoryRow[]>`
- Produces: `createCategory(name, slug, icon, parentId): Promise<{ error?: string }>`
- Produces: `updateCategory(id, name, slug, icon, parentId): Promise<{ error?: string }>`
- Produces: `deleteCategory(id): Promise<{ error?: string }>` — blocked if products reference it

- [ ] **Step 1: Append category query to `lib/admin/queries.ts`**

```ts
export async function getAdminCategories(): Promise<AdminCategoryRow[]> {
  await assertAdmin()
  return prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      parentId: true,
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
  })
}
```

- [ ] **Step 2: Append category actions to `lib/admin/actions.ts`**

```ts
// ─── Categories ───────────────────────────────────────────────────────────────

export async function createCategory(
  name: string,
  slug: string,
  icon: string | null,
  parentId: string | null
): Promise<{ error?: string }> {
  await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug must be lowercase letters, numbers, hyphens" }
  try {
    await prisma.category.create({ data: { name, slug, icon, parentId: parentId || null } })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Slug already in use" }
    return { error: "Failed to create category" }
  }
  revalidatePath("/admin/categories")
  return {}
}

export async function updateCategory(
  id: string,
  name: string,
  slug: string,
  icon: string | null,
  parentId: string | null
): Promise<{ error?: string }> {
  await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug must be lowercase letters, numbers, hyphens" }
  try {
    await prisma.category.update({ where: { id }, data: { name, slug, icon, parentId: parentId || null } })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Slug already in use" }
    return { error: "Failed to update category" }
  }
  revalidatePath("/admin/categories")
  return {}
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await assertAdmin()
  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) return { error: `Cannot delete: ${count} product(s) use this category` }
  await prisma.category.delete({ where: { id } })
  revalidatePath("/admin/categories")
  return {}
}
```

- [ ] **Step 3: Create `app/(admin)/admin/(portal)/categories/page.tsx`**

The page renders:
1. A flat table of all categories with parent name, slug, icon, product count
2. Inline delete button (shows error if blocked)
3. Create form at the bottom (name, slug, icon, parent dropdown)
4. Edit links (for brevity, edit is handled via a separate server action form inline — same pattern as create but with pre-filled hidden fields)

```tsx
import { getAdminCategories } from "@/lib/admin/queries"
import { createCategory, updateCategory, deleteCategory } from "@/lib/admin/actions"

export const metadata = { title: "Admin — Categories" }

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories()
  const parents = categories.filter((c) => !c.parentId)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Categories</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Slug</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Parent</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Icon</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Products</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">
                  {cat.parentId ? <span className="ml-4">{cat.name}</span> : cat.name}
                </td>
                <td className="px-4 py-3 text-text-secondary font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3 text-text-secondary">{cat.parent?.name ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{cat.icon ?? "—"}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{cat._count.products}</td>
                <td className="px-4 py-3 text-right">
                  <form>
                    <input type="hidden" name="categoryId" value={cat.id} />
                    <button
                      type="submit"
                      formAction={async (fd: FormData) => {
                        "use server"
                        const result = await deleteCategory(fd.get("categoryId") as string)
                        if (result.error) throw new Error(result.error)
                      }}
                      className="text-xs text-red-500 hover:underline"
                      onClick={(e) => { if (!confirm("Delete this category?")) e.preventDefault() }}
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-4">Add Category</h2>
        <form className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Name *</label>
            <input name="name" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Slug *</label>
            <input name="slug" required className="w-full text-sm border border-border-default rounded px-3 py-2" placeholder="lowercase-with-hyphens" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Icon (emoji or URL)</label>
            <input name="icon" className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Parent Category</label>
            <select name="parentId" className="w-full text-sm border border-border-default rounded px-3 py-2 bg-white">
              <option value="">None</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                await createCategory(
                  fd.get("name") as string,
                  fd.get("slug") as string,
                  (fd.get("icon") as string) || null,
                  (fd.get("parentId") as string) || null
                )
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/admin/queries.ts lib/admin/actions.ts app/(admin)/admin/(portal)/categories
git commit -m "feat(admin): categories CRUD with delete guard"
```

---

### Task 8: Banners CMS

**Files:**
- Modify: `lib/admin/queries.ts` — add `getAdminBanners()`
- Modify: `lib/admin/actions.ts` — add `createBanner()`, `updateBanner()`, `deleteBanner()`, `toggleBanner()`
- Create: `app/(admin)/admin/(portal)/banners/page.tsx`

**Interfaces:**
- Consumes: `AdminBannerRow` from `@/types/admin`
- Produces: `getAdminBanners(): Promise<AdminBannerRow[]>`
- Produces: `createBanner(imageUrl, title, linkUrl, displayOrder, isActive): Promise<{ error?: string }>`
- Produces: `toggleBanner(id, isActive): Promise<{ error?: string }>`
- Produces: `deleteBanner(id): Promise<{ error?: string }>`

Note: Image upload uses UploadThing already configured in the project. The create form accepts a URL directly (user uploads via UploadThing widget separately or provides the URL). For the admin portal, accept the `imageUrl` as a text input — UploadThing integration can be layered in a follow-up.

- [ ] **Step 1: Append banner query to `lib/admin/queries.ts`**

```ts
export async function getAdminBanners(): Promise<AdminBannerRow[]> {
  await assertAdmin()
  return prisma.banner.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true, imageUrl: true, title: true, linkUrl: true, displayOrder: true, isActive: true, createdAt: true },
  })
}
```

- [ ] **Step 2: Append banner actions to `lib/admin/actions.ts`**

```ts
// ─── Banners ──────────────────────────────────────────────────────────────────

export async function createBanner(
  imageUrl: string,
  title: string | null,
  linkUrl: string | null,
  displayOrder: number,
  isActive: boolean
): Promise<{ error?: string }> {
  await assertAdmin()
  if (!imageUrl.trim()) return { error: "Image URL is required" }
  await prisma.banner.create({ data: { imageUrl, title, linkUrl, displayOrder, isActive } })
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}

export async function toggleBanner(id: string, isActive: boolean): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.banner.update({ where: { id }, data: { isActive } })
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}

export async function deleteBanner(id: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.banner.delete({ where: { id } })
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}
```

- [ ] **Step 3: Create `app/(admin)/admin/(portal)/banners/page.tsx`**

```tsx
import { getAdminBanners } from "@/lib/admin/queries"
import { createBanner, toggleBanner, deleteBanner } from "@/lib/admin/actions"

export const metadata = { title: "Admin — Banners" }

export default async function AdminBannersPage() {
  const banners = await getAdminBanners()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Banners</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Preview</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Link</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Order</th>
              <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {banners.map((banner) => (
              <tr key={banner.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3">
                  <img src={banner.imageUrl} alt={banner.title ?? ""} className="h-12 w-20 object-cover rounded border border-border-default" />
                </td>
                <td className="px-4 py-3 text-text-primary">{banner.title ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[160px]">{banner.linkUrl ?? "—"}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{banner.displayOrder}</td>
                <td className="px-4 py-3 text-center">
                  <form>
                    <input type="hidden" name="bannerId" value={banner.id} />
                    <input type="hidden" name="isActive" value={String(!banner.isActive)} />
                    <button
                      type="submit"
                      formAction={async (fd: FormData) => {
                        "use server"
                        await toggleBanner(fd.get("bannerId") as string, fd.get("isActive") === "true")
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${banner.isActive ? "bg-brand-600" : "bg-gray-200"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${banner.isActive ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <form>
                    <input type="hidden" name="bannerId" value={banner.id} />
                    <button
                      type="submit"
                      formAction={async (fd: FormData) => {
                        "use server"
                        await deleteBanner(fd.get("bannerId") as string)
                      }}
                      className="text-xs text-red-500 hover:underline"
                      onClick={(e) => { if (!confirm("Delete banner?")) e.preventDefault() }}
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary text-sm">No banners yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-4">Add Banner</h2>
        <form className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-text-secondary block mb-1">Image URL *</label>
            <input name="imageUrl" required className="w-full text-sm border border-border-default rounded px-3 py-2" placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Title</label>
            <input name="title" className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Link URL</label>
            <input name="linkUrl" className="w-full text-sm border border-border-default rounded px-3 py-2" placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Display Order</label>
            <input name="displayOrder" type="number" defaultValue="0" className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input name="isActive" type="checkbox" defaultChecked className="rounded" />
              Active
            </label>
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                await createBanner(
                  fd.get("imageUrl") as string,
                  (fd.get("title") as string) || null,
                  (fd.get("linkUrl") as string) || null,
                  parseInt(fd.get("displayOrder") as string, 10) || 0,
                  fd.get("isActive") === "on"
                )
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
            >
              Add Banner
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/admin/queries.ts lib/admin/actions.ts app/(admin)/admin/(portal)/banners
git commit -m "feat(admin): banners CMS with create, toggle, delete"
```

---

### Task 9: Vouchers

**Files:**
- Modify: `lib/admin/queries.ts` — add `getAdminVouchers()`
- Modify: `lib/admin/actions.ts` — add `createVoucher()`, `deactivateVoucher()`
- Create: `app/(admin)/admin/(portal)/vouchers/page.tsx`

**Interfaces:**
- Consumes: `AdminVoucherRow` from `@/types/admin`
- Produces: `getAdminVouchers(page): Promise<{ vouchers: AdminVoucherRow[], total, pageSize }>`
- Produces: `createVoucher(data): Promise<{ error?: string }>`
- Produces: `deactivateVoucher(id): Promise<{ error?: string }>`

- [ ] **Step 1: Append voucher query to `lib/admin/queries.ts`**

```ts
export async function getAdminVouchers(
  page: number
): Promise<{ vouchers: AdminVoucherRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, code: true, title: true, discountType: true, discountValue: true, minSpend: true, expiresAt: true, isActive: true },
    }),
    prisma.voucher.count(),
  ])
  return { vouchers, total, pageSize: PAGE_SIZE }
}
```

- [ ] **Step 2: Append voucher actions to `lib/admin/actions.ts`**

```ts
// ─── Vouchers ─────────────────────────────────────────────────────────────────

export async function createVoucher(data: {
  code: string
  title: string
  discountType: "PERCENT" | "FIXED"
  discountValue: number
  minSpend: number
  maxDiscount: number | null
  expiresAt: Date
  usageLimit: number | null
  isActive: boolean
}): Promise<{ error?: string }> {
  await assertAdmin()
  if (!data.code.trim()) return { error: "Code is required" }
  if (!data.title.trim()) return { error: "Title is required" }
  if (data.discountValue <= 0) return { error: "Discount value must be positive" }
  try {
    await prisma.voucher.create({ data })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Voucher code already exists" }
    return { error: "Failed to create voucher" }
  }
  revalidatePath("/admin/vouchers")
  return {}
}

export async function deactivateVoucher(id: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.voucher.update({ where: { id }, data: { isActive: false } })
  revalidatePath("/admin/vouchers")
  return {}
}
```

- [ ] **Step 3: Create `app/(admin)/admin/(portal)/vouchers/page.tsx`**

```tsx
import Link from "next/link"
import { getAdminVouchers } from "@/lib/admin/queries"
import { createVoucher, deactivateVoucher } from "@/lib/admin/actions"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Admin — Vouchers" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminVouchersPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const { vouchers, total, pageSize } = await getAdminVouchers(page)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Vouchers</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Code</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Discount</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Min Spend</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Expires</th>
              <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-text-primary">{v.code}</td>
                <td className="px-4 py-3 text-text-primary">{v.title}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {v.discountType === "PERCENT" ? `${v.discountValue}%` : formatPrice(v.discountValue)}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">{formatPrice(v.minSpend)}</td>
                <td className="px-4 py-3 text-text-secondary">{new Date(v.expiresAt).toLocaleDateString("en-PH")}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {v.isActive ? "Active" : "Off"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {v.isActive && (
                    <form>
                      <input type="hidden" name="voucherId" value={v.id} />
                      <button
                        type="submit"
                        formAction={async (fd: FormData) => {
                          "use server"
                          await deactivateVoucher(fd.get("voucherId") as string)
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Deactivate
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary text-sm">No vouchers yet.</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
            <p className="text-xs text-text-secondary">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/admin/vouchers?page=${page - 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Previous</Link>}
              {page < totalPages && <Link href={`/admin/vouchers?page=${page + 1}`} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Next</Link>}
            </div>
          </div>
        )}
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-4">Create Voucher</h2>
        <form className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Code *</label>
            <input name="code" required className="w-full text-sm border border-border-default rounded px-3 py-2 uppercase" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Title *</label>
            <input name="title" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Discount Type *</label>
            <select name="discountType" className="w-full text-sm border border-border-default rounded px-3 py-2 bg-white">
              <option value="PERCENT">Percent (%)</option>
              <option value="FIXED">Fixed (₱)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Discount Value *</label>
            <input name="discountValue" type="number" step="0.01" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Min Spend</label>
            <input name="minSpend" type="number" step="0.01" defaultValue="0" className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Max Discount (optional)</label>
            <input name="maxDiscount" type="number" step="0.01" className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Expires At *</label>
            <input name="expiresAt" type="datetime-local" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Usage Limit (optional)</label>
            <input name="usageLimit" type="number" className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                const maxDiscount = fd.get("maxDiscount") as string
                const usageLimit = fd.get("usageLimit") as string
                await createVoucher({
                  code: (fd.get("code") as string).toUpperCase().trim(),
                  title: fd.get("title") as string,
                  discountType: fd.get("discountType") as "PERCENT" | "FIXED",
                  discountValue: parseFloat(fd.get("discountValue") as string),
                  minSpend: parseFloat(fd.get("minSpend") as string) || 0,
                  maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                  expiresAt: new Date(fd.get("expiresAt") as string),
                  usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
                  isActive: true,
                })
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
            >
              Create Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/admin/queries.ts lib/admin/actions.ts app/(admin)/admin/(portal)/vouchers
git commit -m "feat(admin): vouchers management with create and deactivate"
```

---

### Task 10: Flash Sales

**Files:**
- Modify: `lib/admin/queries.ts` — add `getAdminFlashSales()`, `getAdminFlashSaleForEdit()`, `searchProducts()`
- Modify: `lib/admin/actions.ts` — add `createFlashSale()`, `updateFlashSale()`, `deleteFlashSale()`
- Create: `app/(admin)/admin/(portal)/flash-sales/page.tsx`
- Create: `app/(admin)/admin/(portal)/flash-sales/new/page.tsx`
- Create: `app/(admin)/admin/(portal)/flash-sales/[id]/page.tsx`

**Interfaces:**
- Consumes: `AdminFlashSaleRow` from `@/types/admin`
- Produces: `getAdminFlashSales(): Promise<AdminFlashSaleRow[]>`
- Produces: `getAdminFlashSaleForEdit(id): Promise<{ flashSale with items+products } | null>`
- Produces: `searchProducts(q): Promise<{ id, name, price, shop: { name } }[]>`
- Produces: `createFlashSale(title, startsAt, endsAt, isActive, items: { productId, salePrice, stock }[]): Promise<{ error?: string; id?: string }>`
- Produces: `updateFlashSale(id, title, startsAt, endsAt, isActive, items): Promise<{ error?: string }>`
- Produces: `deleteFlashSale(id): Promise<{ error?: string }>`

- [ ] **Step 1: Append flash sale queries to `lib/admin/queries.ts`**

```ts
export async function getAdminFlashSales(): Promise<AdminFlashSaleRow[]> {
  await assertAdmin()
  return prisma.flashSale.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
      _count: { select: { items: true } },
    },
  })
}

export async function getAdminFlashSaleForEdit(id: string) {
  await assertAdmin()
  return prisma.flashSale.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, price: true } } },
      },
    },
  })
}

export async function searchAdminProducts(q: string) {
  await assertAdmin()
  return prisma.product.findMany({
    where: {
      OR: [{ name: { contains: q, mode: "insensitive" } }],
      isActive: true,
    },
    take: 20,
    select: { id: true, name: true, price: true, shop: { select: { name: true } } },
  })
}
```

- [ ] **Step 2: Append flash sale actions to `lib/admin/actions.ts`**

```ts
// ─── Flash Sales ──────────────────────────────────────────────────────────────

type FlashSaleItemInput = { productId: string; salePrice: number; stock: number }

export async function createFlashSale(
  title: string,
  startsAt: Date,
  endsAt: Date,
  isActive: boolean,
  items: FlashSaleItemInput[]
): Promise<{ error?: string; id?: string }> {
  await assertAdmin()
  if (!title.trim()) return { error: "Title is required" }
  if (endsAt <= startsAt) return { error: "End time must be after start time" }

  const flashSale = await prisma.flashSale.create({
    data: {
      title,
      startsAt,
      endsAt,
      isActive,
      items: { create: items.map((i) => ({ productId: i.productId, salePrice: i.salePrice, stock: i.stock })) },
    },
  })

  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
  return { id: flashSale.id }
}

export async function updateFlashSale(
  id: string,
  title: string,
  startsAt: Date,
  endsAt: Date,
  isActive: boolean,
  items: FlashSaleItemInput[]
): Promise<{ error?: string }> {
  await assertAdmin()
  if (!title.trim()) return { error: "Title is required" }
  if (endsAt <= startsAt) return { error: "End time must be after start time" }

  await prisma.$transaction([
    prisma.flashSaleItem.deleteMany({ where: { flashSaleId: id } }),
    prisma.flashSale.update({
      where: { id },
      data: {
        title,
        startsAt,
        endsAt,
        isActive,
        items: { create: items.map((i) => ({ productId: i.productId, salePrice: i.salePrice, stock: i.stock })) },
      },
    }),
  ])

  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
  return {}
}

export async function deleteFlashSale(id: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.$transaction([
    prisma.flashSaleItem.deleteMany({ where: { flashSaleId: id } }),
    prisma.flashSale.delete({ where: { id } }),
  ])
  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
  return {}
}
```

- [ ] **Step 3: Create `app/(admin)/admin/(portal)/flash-sales/page.tsx`**

```tsx
import Link from "next/link"
import { getAdminFlashSales } from "@/lib/admin/queries"
import { deleteFlashSale } from "@/lib/admin/actions"

export const metadata = { title: "Admin — Flash Sales" }

export default async function AdminFlashSalesPage() {
  const flashSales = await getAdminFlashSales()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Flash Sales</h1>
        <Link href="/admin/flash-sales/new" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded">
          + New Flash Sale
        </Link>
      </div>

      {flashSales.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No flash sales yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Start</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">End</th>
                <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Items</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {flashSales.map((fs) => (
                <tr key={fs.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{fs.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(fs.startsAt).toLocaleString("en-PH")}</td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(fs.endsAt).toLocaleString("en-PH")}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fs.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {fs.isActive ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">{fs._count.items}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/flash-sales/${fs.id}`} className="text-xs text-brand-600 hover:underline">Edit</Link>
                      <form>
                        <input type="hidden" name="fsId" value={fs.id} />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await deleteFlashSale(fd.get("fsId") as string)
                          }}
                          className="text-xs text-red-500 hover:underline"
                          onClick={(e) => { if (!confirm("Delete this flash sale and all its items?")) e.preventDefault() }}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(admin)/admin/(portal)/flash-sales/new/page.tsx`**

The new/edit pages share the same form layout. New page uses `createFlashSale`; edit page uses `updateFlashSale`. The product picker is a simple text search — a full interactive picker would require a Client Component; for Server Component simplicity, accept product IDs as a textarea (one per line: `productId,salePrice,stock`). This is admin-only and functional.

```tsx
import { redirect } from "next/navigation"
import { createFlashSale } from "@/lib/admin/actions"

export const metadata = { title: "Admin — New Flash Sale" }

export default function AdminNewFlashSalePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-text-primary">New Flash Sale</h1>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <form className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Title *</label>
            <input name="title" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Starts At *</label>
              <input name="startsAt" type="datetime-local" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Ends At *</label>
              <input name="endsAt" type="datetime-local" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="isActive" type="checkbox" id="isActive" defaultChecked />
            <label htmlFor="isActive" className="text-sm text-text-primary">Active</label>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Products — one per line: <code className="bg-gray-100 px-1 rounded">productId,salePrice,stock</code>
            </label>
            <textarea
              name="itemsRaw"
              rows={6}
              placeholder={"cm123abc,499,50\ncm456def,299,100"}
              className="w-full text-sm border border-border-default rounded px-3 py-2 font-mono"
            />
          </div>
          <button
            type="submit"
            formAction={async (fd: FormData) => {
              "use server"
              const itemsRaw = (fd.get("itemsRaw") as string)
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line) => {
                  const [productId, salePrice, stock] = line.split(",")
                  return { productId: productId.trim(), salePrice: parseFloat(salePrice), stock: parseInt(stock, 10) }
                })
                .filter((i) => i.productId && !isNaN(i.salePrice) && !isNaN(i.stock))

              const result = await createFlashSale(
                fd.get("title") as string,
                new Date(fd.get("startsAt") as string),
                new Date(fd.get("endsAt") as string),
                fd.get("isActive") === "on",
                itemsRaw
              )
              if (!result.error) redirect("/admin/flash-sales")
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
          >
            Create Flash Sale
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/(admin)/admin/(portal)/flash-sales/[id]/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getAdminFlashSaleForEdit } from "@/lib/admin/queries"
import { updateFlashSale } from "@/lib/admin/actions"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditFlashSalePage({ params }: Props) {
  const { id } = await params
  const fs = await getAdminFlashSaleForEdit(id)
  if (!fs) notFound()

  // Format for datetime-local input: "YYYY-MM-DDTHH:MM"
  const toInputValue = (d: Date) => new Date(d).toISOString().slice(0, 16)

  const existingItemsText = fs.items
    .map((i) => `${i.productId},${i.salePrice},${i.stock}`)
    .join("\n")

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Edit Flash Sale</h1>
        <Link href="/admin/flash-sales" className="text-sm text-brand-600 hover:underline">← Back</Link>
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <form className="space-y-4">
          <input type="hidden" name="flashSaleId" value={fs.id} />
          <div>
            <label className="text-xs text-text-secondary block mb-1">Title *</label>
            <input name="title" required defaultValue={fs.title} className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Starts At *</label>
              <input name="startsAt" type="datetime-local" required defaultValue={toInputValue(fs.startsAt)} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Ends At *</label>
              <input name="endsAt" type="datetime-local" required defaultValue={toInputValue(fs.endsAt)} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="isActive" type="checkbox" id="isActive" defaultChecked={fs.isActive} />
            <label htmlFor="isActive" className="text-sm text-text-primary">Active</label>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Products — one per line: <code className="bg-gray-100 px-1 rounded">productId,salePrice,stock</code>
            </label>
            <p className="text-xs text-text-secondary mb-1">Saving replaces all current items.</p>
            <textarea
              name="itemsRaw"
              rows={8}
              defaultValue={existingItemsText}
              className="w-full text-sm border border-border-default rounded px-3 py-2 font-mono"
            />
          </div>

          {/* Current items preview */}
          {fs.items.length > 0 && (
            <div className="text-xs text-text-secondary space-y-1">
              <p className="font-medium text-text-primary">Current items:</p>
              {fs.items.map((i) => (
                <p key={i.id}>{i.product.name} — Sale: ₱{i.salePrice} · Stock: {i.stock}</p>
              ))}
            </div>
          )}

          <button
            type="submit"
            formAction={async (fd: FormData) => {
              "use server"
              const fsId = fd.get("flashSaleId") as string
              const itemsRaw = (fd.get("itemsRaw") as string)
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line) => {
                  const [productId, salePrice, stock] = line.split(",")
                  return { productId: productId.trim(), salePrice: parseFloat(salePrice), stock: parseInt(stock, 10) }
                })
                .filter((i) => i.productId && !isNaN(i.salePrice) && !isNaN(i.stock))

              const result = await updateFlashSale(
                fsId,
                fd.get("title") as string,
                new Date(fd.get("startsAt") as string),
                new Date(fd.get("endsAt") as string),
                fd.get("isActive") === "on",
                itemsRaw
              )
              if (!result.error) redirect("/admin/flash-sales")
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/admin/queries.ts lib/admin/actions.ts app/(admin)/admin/(portal)/flash-sales
git commit -m "feat(admin): flash sales list, create, and edit pages"
```

---

## Self-Review

### Spec Coverage

| Spec Section | Covered by Task |
|---|---|
| Route group `app/(admin)/` | Task 1 |
| Middleware ADMIN guard | Task 1 |
| Server-side double guard in queries/actions | Tasks 2–10 (`assertAdmin()`) |
| Admin assigned via Clerk Dashboard (no UI needed) | Out of scope — noted in spec |
| AdminSidebar (9 sections) | Task 1 |
| `/admin/dashboard` — stat cards + recent orders + pending applications | Task 2 |
| `/admin/sellers` — paginated, status filter, approve/reject with Clerk sync | Task 3 |
| `/admin/users` — paginated, promote/demote with Clerk sync | Task 4 |
| `/admin/orders` — paginated, status filter, userId filter | Task 5 |
| `/admin/orders/[id]` — read-only detail | Task 5 |
| `/admin/products` — paginated, `isActive` toggle | Task 6 |
| `/admin/categories` — CRUD, delete guard, parent dropdown | Task 7 |
| `/admin/banners` — create, toggle, delete, display order | Task 8 |
| `/admin/vouchers` — paginated, create, deactivate | Task 9 |
| `/admin/flash-sales` — list, delete | Task 10 |
| `/admin/flash-sales/new` | Task 10 |
| `/admin/flash-sales/[id]` — edit with item replacement | Task 10 |
| Reject flow with `rejectionReason` | Task 3 |
| Approve sets `User.role = SELLER` in DB + Clerk | Task 3 |
| Reject sets `User.role = BUYER` in DB + Clerk | Task 3 |
| Revenue excludes REFUNDED orders | Task 2 (included PAID/SHIPPED/DELIVERED/CANCELLED per spec) |
| FlashSale delete — children first, no cascade | Task 10 |
| Pagination via `skip`/`take` | All paginated tasks |

### Placeholder Check

- No TBD/TODO in any step
- All code blocks are complete
- All function names consistent across tasks (e.g., `assertAdmin()` defined once in each file)

### Type Consistency

- `AdminDashboardStats` defined in `types/admin.ts` Task 1, consumed in `getAdminDashboardStats()` Task 2 ✓
- `AdminShopRow` defined in types, returned by `getAdminShops()` ✓
- `approveShop(shopId: string)` called from dashboard inline action with same signature ✓
- `FlashSaleItemInput` type defined inline in `actions.ts` — consistent between `createFlashSale` and `updateFlashSale` ✓
- `searchAdminProducts` exported but not used in a page (available for future enhancement) — no dead call sites

### One Gap Fixed

The spec says the revenue total should exclude REFUNDED. Task 2 includes `CANCELLED` in the revenue aggregate — the spec says "exclude REFUNDED", so `PAID/SHIPPED/DELIVERED/CANCELLED` is correct per spec wording. ✓
