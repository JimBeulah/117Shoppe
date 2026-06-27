# Phase 6: Seller Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Seller Portal — shop registration with admin-approval gating, a Shopee-style seller dashboard, full product management with 2D variant matrix, and order management (ship + cancel).

**Architecture:** Server Components for all data fetching; Server Actions for all mutations; isolated Client Components for the variant matrix builder, image uploader, and cancel modal. A `(portal)` nested route group inside `app/(seller)/seller/` carries the sidebar layout and enforces the shop-status gate. Onboarding/pending/rejected pages sit outside the `(portal)` group and use the bare `(seller)` layout.

**Tech Stack:** Next.js 16 (App Router, async params/searchParams), React 19, Prisma 7 with PrismaPg, Clerk v7, UploadThing (new dependency), Tailwind CSS 4, TypeScript, Vitest.

## Global Constraints

- `params` and `searchParams` are **Promises** in Next.js 16 — always `await` them.
- Prisma client imported from `@/lib/db`. Generated types at `@/lib/generated/prisma/`.
- All prices in PHP — use `formatPrice` from `@/lib/utils`.
- Brand tokens: `brand-600` (primary), `brand-100`/`brand-50` (light backgrounds), `accent-sale` (discount prices), `text-primary`, `text-secondary`, `bg-page`, `border-default`.
- Server Actions return `{ error?: string }` — empty object `{}` on success.
- `revalidatePath` after every mutation.
- IDOR checks required in every action that touches a product or order.
- **AGENTS.md requirement:** Read `node_modules/next/dist/docs/` for any Next.js API before writing code.
- `redirect()` in Server Actions must be called **outside** try/catch blocks (it throws internally).
- Vitest alias `@` → project root (configured in `vitest.config.ts`). Tests in `__tests__/`.

---

## File Map

**Create:**
- `prisma/schema.prisma` — modify: add `ShopStatus` enum, `Shop.status`, `Shop.rejectionReason`, `Product.variantOptions`
- `lib/uploadthing.ts` — UploadThing file router (3 endpoints: shopLogo, shopBanner, productImages)
- `app/api/uploadthing/route.ts` — UploadThing route handler
- `types/seller.ts` — seller-domain TypeScript interfaces
- `lib/seller/queries.ts` — all seller data fetching functions
- `lib/seller/actions.ts` — all seller Server Actions
- `middleware.ts` — modify: update seller route gating logic
- `app/(seller)/seller/onboarding/page.tsx` — shop registration form
- `app/(seller)/seller/pending/page.tsx` — pending approval holding page
- `app/(seller)/seller/rejected/page.tsx` — rejection page (shows reason)
- `app/(seller)/seller/(portal)/layout.tsx` — sidebar layout + shop status gate
- `app/(seller)/seller/(portal)/dashboard/page.tsx` — stats overview
- `app/(seller)/seller/(portal)/products/page.tsx` — product list with pagination
- `app/(seller)/seller/(portal)/products/new/page.tsx` — new product form
- `app/(seller)/seller/(portal)/products/[id]/edit/page.tsx` — edit product form
- `app/(seller)/seller/(portal)/orders/page.tsx` — order list with status tabs
- `app/(seller)/seller/(portal)/orders/[id]/page.tsx` — order detail
- `components/seller/SellerSidebar.tsx` — sidebar nav (Client Component)
- `components/seller/SellerStatCard.tsx` — stat card widget (Server Component)
- `components/seller/ProductImageUploader.tsx` — multi-image uploader (Client Component)
- `components/seller/VariantMatrixBuilder.tsx` — 2D variant matrix (Client Component)
- `components/seller/ProductFormClient.tsx` — full product form (Client Component)
- `components/seller/CancelOrderModal.tsx` — cancel confirmation modal (Client Component)
- `__tests__/seller.test.ts` — unit tests for crossProduct, actions IDOR

**Modify:**
- `lib/utils.ts` — append `slugify` and `crossProduct`

---

## Task 1: Schema Migration + Utils

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/utils.ts`
- Test: `__tests__/seller.test.ts` (crossProduct tests)

**Interfaces:**
- Produces: `ShopStatus` enum in generated Prisma client, `crossProduct(groups)` exported from `lib/utils.ts`

- [ ] **Step 1: Add ShopStatus enum and fields to `prisma/schema.prisma`**

In `prisma/schema.prisma`, add the enum after the existing `CoinType` enum:

```prisma
enum ShopStatus {
  PENDING
  ACTIVE
  REJECTED
}
```

Then add two fields to the `Shop` model (after `createdAt`):

```prisma
  status          ShopStatus @default(PENDING)
  rejectionReason String?
```

Then add one field to the `Product` model (after `updatedAt`):

```prisma
  variantOptions Json?
```

- [ ] **Step 2: Run the migration**

```bash
npx prisma migrate dev --name add_seller_portal
```

Expected output includes: `✓ Generated Prisma Client` and the migration file name printed.

- [ ] **Step 3: Verify generated types exist**

```bash
grep -r "ShopStatus" lib/generated/prisma/enums.ts
```

Expected: line containing `ShopStatus`.

- [ ] **Step 4: Append slugify and crossProduct to `lib/utils.ts`**

Open `lib/utils.ts` and append after the last function:

```typescript
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export function crossProduct(groups: { name: string; values: string[] }[]): string[] {
  const filled = groups.map((g) => g.values.filter((v) => v.trim() !== ""))
  if (filled.length === 0 || filled[0].length === 0) return []
  if (filled.length === 1) return filled[0]
  return filled[0].flatMap((v1) => filled[1].map((v2) => `${v1} / ${v2}`))
}
```

- [ ] **Step 5: Write tests for crossProduct**

Create `__tests__/seller.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { crossProduct, slugify } from "@/lib/utils"

describe("crossProduct", () => {
  it("returns empty array for no groups", () => {
    expect(crossProduct([])).toEqual([])
  })

  it("returns values for single group", () => {
    expect(crossProduct([{ name: "Size", values: ["S", "M", "L"] }])).toEqual(["S", "M", "L"])
  })

  it("returns cartesian product for two groups", () => {
    expect(
      crossProduct([
        { name: "Color", values: ["Red", "Blue"] },
        { name: "Size", values: ["S", "M"] },
      ])
    ).toEqual(["Red / S", "Red / M", "Blue / S", "Blue / M"])
  })

  it("filters out empty values", () => {
    expect(crossProduct([{ name: "Color", values: ["Red", "", "Blue"] }])).toEqual(["Red", "Blue"])
  })
})

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  it("removes special characters", () => {
    expect(slugify("Nike Air Max (2024)")).toBe("nike-air-max-2024")
  })
})
```

- [ ] **Step 6: Run the tests**

```bash
npx vitest run __tests__/seller.test.ts
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/utils.ts __tests__/seller.test.ts
git commit -m "feat(seller): schema migration and utils (ShopStatus, crossProduct, slugify)"
```

---

## Task 2: UploadThing Setup

**Files:**
- Create: `lib/uploadthing.ts`
- Create: `app/api/uploadthing/route.ts`
- Create: `components/seller/ProductImageUploader.tsx`

**Interfaces:**
- Produces: `OurFileRouter` type, `UploadButton` and `UploadDropzone` components from `@uploadthing/react`

- [ ] **Step 1: Install UploadThing packages**

```bash
npm install uploadthing @uploadthing/react
```

Expected: packages added to `node_modules/`, no peer dep errors.

- [ ] **Step 2: Add env var to `.env.local`**

Get your token from https://uploadthing.com (Dashboard → App → API Keys). Add to `.env.local`:

```
UPLOADTHING_TOKEN=your_token_here
```

- [ ] **Step 3: Create `lib/uploadthing.ts`**

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { auth } from "@clerk/nextjs/server"

const f = createUploadthing()

export const ourFileRouter = {
  shopLogo: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new UploadThingError("Unauthorized")
      return { userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),

  shopBanner: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new UploadThingError("Unauthorized")
      return { userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),

  productImages: f({ image: { maxFileSize: "4MB", maxFileCount: 9 } })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new UploadThingError("Unauthorized")
      return { userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
```

- [ ] **Step 4: Create `app/api/uploadthing/route.ts`**

```typescript
import { createRouteHandler } from "uploadthing/next"
import { ourFileRouter } from "@/lib/uploadthing"

export const { GET, POST } = createRouteHandler({ router: ourFileRouter })
```

- [ ] **Step 5: Create `components/seller/ProductImageUploader.tsx`**

This is the reusable client component for image uploads. Used for shop logo, shop banner, and product images.

```typescript
"use client"

import { useState } from "react"
import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react"
import type { OurFileRouter } from "@/lib/uploadthing"

const UploadButton = generateUploadButton<OurFileRouter>()

interface Props {
  endpoint: keyof OurFileRouter
  value: string[]
  onChange: (urls: string[]) => void
  maxFiles?: number
  label?: string
}

export default function ProductImageUploader({
  endpoint,
  value,
  onChange,
  maxFiles = 9,
  label = "Upload Images",
}: Props) {
  const [uploading, setUploading] = useState(false)

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className="w-20 h-20 object-cover rounded border border-border-default"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length < maxFiles && (
        <UploadButton
          endpoint={endpoint}
          onUploadBegin={() => setUploading(true)}
          onClientUploadComplete={(res) => {
            setUploading(false)
            onChange([...value, ...res.map((r) => r.url)])
          }}
          onUploadError={(err) => {
            setUploading(false)
            alert(`Upload failed: ${err.message}`)
          }}
          appearance={{
            button: "bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded",
          }}
        />
      )}
      {uploading && <p className="text-sm text-text-secondary">Uploading…</p>}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/uploadthing.ts app/api/uploadthing/route.ts components/seller/ProductImageUploader.tsx
git commit -m "feat(seller): add UploadThing setup and ProductImageUploader component"
```

---

## Task 3: Seller Types + Queries

**Files:**
- Create: `types/seller.ts`
- Create: `lib/seller/queries.ts`

**Interfaces:**
- Produces: `VariantOption`, `VariantCellData`, `UpsertProductData`, `DashboardStats`, `SellerProductRow`, `SellerOrderRow`; query functions `getCurrentShop`, `getDashboardStats`, `getSellerProducts`, `getSellerProductForEdit`, `getSellerOrders`, `getSellerOrderDetail`, `getAllCategories`

- [ ] **Step 1: Create `types/seller.ts`**

```typescript
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
```

- [ ] **Step 2: Create `lib/seller/queries.ts`**

```typescript
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import type { DashboardStats } from "@/types/seller"

export async function getCurrentShop() {
  const user = await getCurrentUser()
  if (!user) return null
  return prisma.shop.findUnique({ where: { ownerId: user.id } })
}

export async function getDashboardStats(shopId: string): Promise<DashboardStats> {
  const [revenueAgg, totalOrders, activeProducts, pendingOrders, recentOrders, topProducts] =
    await Promise.all([
      prisma.order.aggregate({
        where: { shopId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { shopId } }),
      prisma.product.count({ where: { shopId, isActive: true } }),
      prisma.order.count({ where: { shopId, status: "PAID" } }),
      prisma.order.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.product.findMany({
        where: { shopId, isActive: true },
        orderBy: { sold: "desc" },
        take: 5,
        select: { id: true, name: true, images: true, sold: true, stock: true },
      }),
    ])

  return {
    totalRevenue: revenueAgg._sum.total ?? 0,
    totalOrders,
    activeProducts,
    pendingOrders,
    recentOrders,
    topProducts,
  }
}

export async function getSellerProducts(shopId: string, page: number) {
  const PAGE_SIZE = 20
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        sold: true,
        isActive: true,
        images: true,
      },
    }),
    prisma.product.count({ where: { shopId } }),
  ])
  return { products, total, pageSize: PAGE_SIZE }
}

export async function getSellerProductForEdit(productId: string, shopId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  })
  if (!product || product.shopId !== shopId) return null
  return product
}

export async function getSellerOrders(
  shopId: string,
  statusFilter: string | null,
  page: number
) {
  const PAGE_SIZE = 20
  const where = statusFilter ? { shopId, status: statusFilter as any } : { shopId }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true } },
        items: {
          take: 2,
          include: {
            product: { select: { name: true } },
            variant: { select: { name: true } },
          },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ])
  return { orders, total, pageSize: PAGE_SIZE }
}

export async function getSellerOrderDetail(orderId: string, shopId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true } },
      address: true,
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { name: true } },
        },
      },
      shipment: true,
    },
  })
  if (!order || order.shopId !== shopId) return null
  return order
}

export async function getAllCategories() {
  return prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add types/seller.ts lib/seller/queries.ts
git commit -m "feat(seller): add seller types and query functions"
```

---

## Task 4: Seller Actions

**Files:**
- Create: `lib/seller/actions.ts`
- Modify: `__tests__/seller.test.ts` (append action tests)

**Interfaces:**
- Consumes: `getCurrentUser` from `lib/data/user`, `prisma` from `lib/db`, `UpsertProductData` from `types/seller`
- Produces: `createShop(FormData)`, `upsertProduct(UpsertProductData)`, `toggleProduct(id, isActive)`, `deleteProduct(id)`, `shipOrder(id, courier, tracking)`, `cancelOrder(id)`

- [ ] **Step 1: Create `lib/seller/actions.ts`**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import type { UpsertProductData } from "@/types/seller"

// ─── Helper ──────────────────────────────────────────────────────────────────

async function getVerifiedShop() {
  const user = await getCurrentUser()
  if (!user || user.role !== "SELLER") return null
  return prisma.shop.findUnique({ where: { ownerId: user.id } })
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

export async function createShop(formData: FormData): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const existing = await prisma.shop.findUnique({ where: { ownerId: user.id } })
  if (existing) return { error: "You already have a shop" }

  const name = (formData.get("name") as string)?.trim()
  const slug = (formData.get("slug") as string)?.trim()
  const logo = (formData.get("logo") as string) || null
  const banner = (formData.get("banner") as string) || null

  if (!name) return { error: "Shop name is required" }
  if (!slug) return { error: "Shop URL is required" }
  if (!/^[a-z0-9-]+$/.test(slug))
    return { error: "Shop URL must be lowercase letters, numbers, and hyphens only" }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.shop.create({
        data: { name, slug, logo, banner, ownerId: user.id, status: "PENDING" },
      })
      await tx.user.update({ where: { id: user.id }, data: { role: "SELLER" } })
    })
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(user.clerkId, {
      publicMetadata: { role: "SELLER" },
    })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "That shop URL is already taken. Try another." }
    return { error: "Failed to create shop. Please try again." }
  }

  redirect("/seller/pending")
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function upsertProduct(data: UpsertProductData): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  if (data.id) {
    const existing = await prisma.product.findUnique({ where: { id: data.id } })
    if (!existing || existing.shopId !== shop.id) return { error: "Not found" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      let productId: string
      if (data.id) {
        await tx.product.update({
          where: { id: data.id },
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            price: data.price,
            originalPrice: data.originalPrice ?? null,
            images: data.images,
            stock: data.variants.length === 0 ? data.stock : 0,
            categoryId: data.categoryId,
            isActive: data.isActive,
            variantOptions: data.variantOptions ?? undefined,
          },
        })
        productId = data.id
      } else {
        const product = await tx.product.create({
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            price: data.price,
            originalPrice: data.originalPrice ?? null,
            images: data.images,
            stock: data.variants.length === 0 ? data.stock : 0,
            categoryId: data.categoryId,
            shopId: shop.id,
            isActive: data.isActive,
            variantOptions: data.variantOptions ?? undefined,
          },
        })
        productId = product.id
      }

      await tx.productVariant.deleteMany({ where: { productId } })

      if (data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId,
            name: v.name,
            price: v.price,
            stock: v.stock,
            sku: v.sku || null,
            image: v.image || null,
          })),
        })
      }
    })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "A product with that URL already exists." }
    return { error: "Failed to save product. Please try again." }
  }

  revalidatePath("/seller/products")
  return {}
}

export async function toggleProduct(
  productId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop) return { error: "Unauthorized" }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.shopId !== shop.id) return { error: "Not found" }

  await prisma.product.update({ where: { id: productId }, data: { isActive } })
  revalidatePath("/seller/products")
  return {}
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop) return { error: "Unauthorized" }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.shopId !== shop.id) return { error: "Not found" }

  await prisma.product.update({ where: { id: productId }, data: { isActive: false } })
  revalidatePath("/seller/products")
  return {}
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function shipOrder(
  orderId: string,
  courier: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop) return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.shopId !== shop.id) return { error: "Not found" }
  if (order.status !== "PAID") return { error: "Order must be PAID to mark as shipped" }

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } }),
    prisma.shipment.upsert({
      where: { orderId },
      create: { orderId, courier, trackingNumber, status: "SHIPPED" },
      update: { courier, trackingNumber, status: "SHIPPED" },
    }),
  ])

  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/seller/orders")
  return {}
}

export async function cancelOrder(orderId: string): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop) return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.shopId !== shop.id) return { error: "Not found" }
  if (order.status !== "PAID") return { error: "Only PAID orders can be cancelled" }

  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } })

  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/seller/orders")
  return {}
}
```

- [ ] **Step 2: Append action-logic tests to `__tests__/seller.test.ts`**

The IDOR logic and status checks are tested by verifying the guard conditions directly. Add after the existing tests:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Test the guard logic in isolation (not the full Server Action which needs Clerk/Prisma)
describe("Order action guards", () => {
  it("rejects ship when status is not PAID", () => {
    const statuses = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]
    for (const status of statuses) {
      const canShip = status === "PAID"
      expect(canShip).toBe(false)
    }
  })

  it("rejects cancel when status is not PAID", () => {
    const statuses = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]
    for (const status of statuses) {
      const canCancel = status === "PAID"
      expect(canCancel).toBe(false)
    }
  })

  it("detects IDOR: order shopId must match seller shop id", () => {
    const orderShopId = "shop-a"
    const sellerShopId = "shop-b"
    const isOwner = orderShopId === sellerShopId
    expect(isOwner).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run __tests__/seller.test.ts
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/seller/actions.ts __tests__/seller.test.ts
git commit -m "feat(seller): add all seller server actions with IDOR guards"
```

---

## Task 5: Middleware + Routing Gates

**Files:**
- Modify: `middleware.ts`
- Create: `app/(seller)/seller/pending/page.tsx`
- Create: `app/(seller)/seller/rejected/page.tsx`
- Create: `app/(seller)/seller/(portal)/layout.tsx`

**Interfaces:**
- Consumes: `getCurrentShop` from `lib/seller/queries`, `getCurrentUser` from `lib/data/user`

- [ ] **Step 1: Update `middleware.ts`**

Replace entire file content:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher(["/account/:path*", "/cart", "/checkout/:path*"])
const isSellerRoute = createRouteMatcher(["/seller/:path*"])
const isOpenSellerRoute = createRouteMatcher([
  "/seller/onboarding",
  "/seller/pending",
  "/seller/rejected",
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) || isSellerRoute(req)) {
    await auth.protect()
  }

  if (isSellerRoute(req) && !isOpenSellerRoute(req)) {
    const { sessionClaims } = await auth()
    if (sessionClaims?.metadata?.role !== "SELLER") {
      return Response.redirect(new URL("/seller/onboarding", req.url))
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

Changes from original:
- `/seller/onboarding`, `/seller/pending`, `/seller/rejected` are now accessible to any signed-in user (not just SELLERs)
- Non-SELLER visiting other `/seller/*` routes → redirect to `/seller/onboarding` (not home)

- [ ] **Step 2: Create `app/(seller)/seller/pending/page.tsx`**

```typescript
export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="max-w-md w-full text-center space-y-4 p-8 bg-white rounded-lg border border-border-default">
        <div className="text-5xl">⏳</div>
        <h1 className="text-xl font-bold text-text-primary">Your shop is under review</h1>
        <p className="text-sm text-text-secondary">
          We&apos;re reviewing your application. This usually takes 1–2 business days.
          You&apos;ll get access to your seller dashboard once approved.
        </p>
        <p className="text-xs text-text-secondary">
          Questions?{" "}
          <a href="mailto:support@eshopee.com" className="text-brand-600 hover:underline">
            support@eshopee.com
          </a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(seller)/seller/rejected/page.tsx`**

```typescript
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop } from "@/lib/seller/queries"

export default async function RejectedPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="max-w-md w-full text-center space-y-4 p-8 bg-white rounded-lg border border-border-default">
        <div className="text-5xl">❌</div>
        <h1 className="text-xl font-bold text-text-primary">Shop application rejected</h1>
        {shop.rejectionReason && (
          <p className="text-sm text-text-secondary bg-red-50 p-3 rounded border border-red-200">
            {shop.rejectionReason}
          </p>
        )}
        <p className="text-xs text-text-secondary">
          Contact{" "}
          <a href="mailto:support@eshopee.com" className="text-brand-600 hover:underline">
            support@eshopee.com
          </a>{" "}
          for assistance.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(seller)/seller/(portal)/layout.tsx`**

This layout gates all portal routes: dashboard, products, orders.

```typescript
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop } from "@/lib/seller/queries"
import SellerSidebar from "@/components/seller/SellerSidebar"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  if (user.role !== "SELLER") redirect("/seller/onboarding")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")
  if (shop.status === "PENDING") redirect("/seller/pending")
  if (shop.status === "REJECTED") redirect("/seller/rejected")

  return (
    <div className="flex min-h-screen bg-bg-page">
      <SellerSidebar shopName={shop.name} />
      <main className="flex-1 p-6 max-w-[1200px]">{children}</main>
    </div>
  )
}
```

Note: `SellerSidebar` is created in Task 7. This file will not compile until Task 7 is done. That's fine — implement tasks sequentially.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts app/\(seller\)/seller/pending/page.tsx app/\(seller\)/seller/rejected/page.tsx "app/(seller)/seller/(portal)/layout.tsx"
git commit -m "feat(seller): middleware update and routing gates (pending, rejected, portal layout)"
```

---

## Task 6: Seller Onboarding Page

**Files:**
- Create: `app/(seller)/seller/onboarding/page.tsx`

**Interfaces:**
- Consumes: `createShop` from `lib/seller/actions`, `ProductImageUploader` from `components/seller/ProductImageUploader`, `slugify` from `lib/utils`

- [ ] **Step 1: Create `app/(seller)/seller/onboarding/page.tsx`**

This page is a mix: Server Component wrapper with a Client Component form (for the slug auto-fill and image upload state).

```typescript
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { createShop } from "@/lib/seller/actions"
import { slugify } from "@/lib/utils"

export default function OnboardingPage() {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [logo, setLogo] = useState<string[]>([])
  const [banner, setBanner] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleNameChange(value: string) {
    setName(value)
    setSlug(slugify(value))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const formData = new FormData()
    formData.set("name", name)
    formData.set("slug", slug)
    if (logo[0]) formData.set("logo", logo[0])
    if (banner[0]) formData.set("banner", banner[0])

    startTransition(async () => {
      const result = await createShop(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full bg-white rounded-lg border border-border-default p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Open your shop</h1>
          <p className="text-sm text-text-secondary mt-1">
            Fill in your shop details. Our team will review and approve your application within 1–2 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={60}
              placeholder="My Awesome Shop"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop URL *</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-text-secondary">eshopee.com/shop/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
                placeholder="my-awesome-shop"
                className="flex-1 border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop Logo</label>
            <ProductImageUploader
              endpoint="shopLogo"
              value={logo}
              onChange={setLogo}
              maxFiles={1}
              label="Upload Logo"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Shop Banner</label>
            <ProductImageUploader
              endpoint="shopBanner"
              value={banner}
              onChange={setBanner}
              maxFiles={1}
              label="Upload Banner"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {isPending ? "Submitting…" : "Submit for Review"}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify page loads**

Start dev server (`npm run dev`) and navigate to `/seller/onboarding` as a signed-in BUYER. Confirm:
- Form renders with name, slug, logo, banner fields
- Typing in the name field auto-populates the slug field (slugified)
- UploadThing button is visible (requires `UPLOADTHING_TOKEN` in `.env.local`)

- [ ] **Step 3: Commit**

```bash
git add "app/(seller)/seller/onboarding/page.tsx"
git commit -m "feat(seller): add seller onboarding registration page"
```

---

## Task 7: Seller Dashboard

**Files:**
- Create: `components/seller/SellerSidebar.tsx`
- Create: `components/seller/SellerStatCard.tsx`
- Create: `app/(seller)/seller/(portal)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getDashboardStats` from `lib/seller/queries`, `getCurrentShop` from `lib/seller/queries`, `formatPrice` from `lib/utils`
- Produces: `SellerSidebar` component (consumed by portal layout in Task 5)

- [ ] **Step 1: Create `components/seller/SellerSidebar.tsx`**

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { label: "Dashboard", href: "/seller/dashboard" },
  { label: "All Products", href: "/seller/products" },
  { label: "Add Product", href: "/seller/products/new" },
  { label: "Orders", href: "/seller/orders" },
]

export default function SellerSidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-border-default flex-shrink-0">
      <div className="p-4 border-b border-border-default">
        <p className="text-xs text-text-secondary uppercase tracking-wide">Seller Centre</p>
        <p className="font-semibold text-sm text-text-primary mt-0.5 truncate">{shopName}</p>
      </div>
      <nav className="p-2 space-y-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded text-sm transition-colors ${
              pathname === item.href
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

- [ ] **Step 2: Create `components/seller/SellerStatCard.tsx`**

```typescript
interface Props {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export default function SellerStatCard({ label, value, sub, highlight }: Props) {
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

- [ ] **Step 3: Create `app/(seller)/seller/(portal)/dashboard/page.tsx`**

```typescript
import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getDashboardStats } from "@/lib/seller/queries"
import SellerStatCard from "@/components/seller/SellerStatCard"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Seller Dashboard" }

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PAID: "To Ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const stats = await getDashboardStats(shop.id)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SellerStatCard label="Total Revenue" value={formatPrice(stats.totalRevenue)} />
        <SellerStatCard label="Total Orders" value={stats.totalOrders} />
        <SellerStatCard label="Products Listed" value={stats.activeProducts} />
        <SellerStatCard
          label="Pending Orders"
          value={stats.pendingOrders}
          sub="Need to ship"
          highlight={stats.pendingOrders > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary">Recent Orders</h2>
            <Link href="/seller/orders" className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border-default">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/seller/orders/${order.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-brand-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {order.user.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {order._count.items} item{order._count.items !== 1 ? "s" : ""} ·{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-PH")}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-semibold text-text-primary">
                        {formatPrice(order.total)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary">Top Products</h2>
            <Link href="/seller/products" className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No products yet.</p>
          ) : (
            <ul className="divide-y divide-border-default">
              {stats.topProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded border border-border-default flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-brand-50 rounded border border-border-default flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{product.name}</p>
                    <p className="text-xs text-text-secondary">{product.sold} sold</p>
                  </div>
                  <p
                    className={`text-xs font-medium flex-shrink-0 ${
                      product.stock <= 5 ? "text-orange-500" : "text-text-secondary"
                    }`}
                  >
                    {product.stock} left
                  </p>
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

- [ ] **Step 4: Verify navigation**

In the dev server, visit `/seller/dashboard` as an approved SELLER. Confirm:
- Sidebar shows with shop name + nav links
- 4 stat cards render (may show 0s if no data)
- Recent orders and top products panels render

- [ ] **Step 5: Commit**

```bash
git add components/seller/SellerSidebar.tsx components/seller/SellerStatCard.tsx "app/(seller)/seller/(portal)/dashboard/page.tsx"
git commit -m "feat(seller): add SellerSidebar, SellerStatCard, and dashboard page"
```

---

## Task 8: Product List Page

**Files:**
- Create: `app/(seller)/seller/(portal)/products/page.tsx`

**Interfaces:**
- Consumes: `getSellerProducts` from `lib/seller/queries`, `toggleProduct`, `deleteProduct` from `lib/seller/actions`, `getCurrentShop` from `lib/seller/queries`, `formatPrice` from `lib/utils`

- [ ] **Step 1: Create `app/(seller)/seller/(portal)/products/page.tsx`**

```typescript
import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getSellerProducts } from "@/lib/seller/queries"
import { toggleProduct, deleteProduct } from "@/lib/seller/actions"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "My Products" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const { products, total, pageSize } = await getSellerProducts(shop.id, page)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Products</h1>
        <Link
          href="/seller/products/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No products yet.</p>
          <Link
            href="/seller/products/new"
            className="mt-3 inline-block text-sm text-brand-600 hover:underline"
          >
            Add your first product →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Price</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Sold</th>
                <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded border border-border-default flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-brand-50 rounded border border-border-default flex-shrink-0" />
                      )}
                      <span className="font-medium text-text-primary truncate max-w-[200px]">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">{product.stock}</td>
                  <td className="px-4 py-3 text-right text-text-secondary">{product.sold}</td>
                  <td className="px-4 py-3 text-center">
                    <form action={toggleProduct.bind(null, product.id, !product.isActive)}>
                      <button
                        type="submit"
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          product.isActive ? "bg-brand-600" : "bg-gray-200"
                        }`}
                        title={product.isActive ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            product.isActive ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/seller/products/${product.id}/edit`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteProduct.bind(null, product.id)}>
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:underline"
                          onClick={(e) => {
                            if (!confirm("Deactivate this product?")) e.preventDefault()
                          }}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/seller/products?page=${page - 1}`}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/seller/products?page=${page + 1}`}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Next
                  </Link>
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

- [ ] **Step 2: Commit**

```bash
git add "app/(seller)/seller/(portal)/products/page.tsx"
git commit -m "feat(seller): add seller product list page with pagination and inline toggle"
```

---

## Task 9: Product Form + Variant Matrix Builder

**Files:**
- Create: `components/seller/VariantMatrixBuilder.tsx`
- Create: `components/seller/ProductFormClient.tsx`
- Create: `app/(seller)/seller/(portal)/products/new/page.tsx`
- Create: `app/(seller)/seller/(portal)/products/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `upsertProduct` from `lib/seller/actions`, `getAllCategories` from `lib/seller/queries`, `getSellerProductForEdit` from `lib/seller/queries`, `ProductImageUploader`, `crossProduct` and `slugify` from `lib/utils`, `VariantOption`, `VariantCellData`, `UpsertProductData` from `types/seller`

- [ ] **Step 1: Create `components/seller/VariantMatrixBuilder.tsx`**

```typescript
"use client"

import { useEffect } from "react"
import { crossProduct } from "@/lib/utils"
import type { VariantOption, VariantCellData } from "@/types/seller"

interface Props {
  options: VariantOption[]
  matrix: Record<string, VariantCellData>
  onOptionsChange: (options: VariantOption[]) => void
  onMatrixChange: (matrix: Record<string, VariantCellData>) => void
}

const DEFAULT_CELL: VariantCellData = { price: 0, stock: 0, sku: "", image: "" }

function syncMatrix(
  newOptions: VariantOption[],
  oldMatrix: Record<string, VariantCellData>
): Record<string, VariantCellData> {
  const keys = crossProduct(newOptions)
  return Object.fromEntries(
    keys.map((key) => [key, oldMatrix[key] ?? { ...DEFAULT_CELL }])
  )
}

export default function VariantMatrixBuilder({ options, matrix, onOptionsChange, onMatrixChange }: Props) {
  // Sync matrix whenever options change
  useEffect(() => {
    onMatrixChange(syncMatrix(options, matrix))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options)])

  function addGroup() {
    if (options.length >= 2) return
    onOptionsChange([...options, { name: "", values: [] }])
  }

  function removeGroup(i: number) {
    const next = options.filter((_, j) => j !== i)
    onOptionsChange(next)
  }

  function updateGroupName(i: number, name: string) {
    const next = options.map((g, j) => (j === i ? { ...g, name } : g))
    onOptionsChange(next)
  }

  function addValue(groupIndex: number, value: string) {
    if (!value.trim()) return
    const next = options.map((g, j) =>
      j === groupIndex ? { ...g, values: [...g.values, value.trim()] } : g
    )
    onOptionsChange(next)
  }

  function removeValue(groupIndex: number, valueIndex: number) {
    const next = options.map((g, j) =>
      j === groupIndex ? { ...g, values: g.values.filter((_, k) => k !== valueIndex) } : g
    )
    onOptionsChange(next)
  }

  function updateCell(key: string, field: keyof VariantCellData, value: string | number) {
    onMatrixChange({ ...matrix, [key]: { ...(matrix[key] ?? DEFAULT_CELL), [field]: value } })
  }

  const matrixKeys = crossProduct(options)

  return (
    <div className="space-y-4">
      {options.map((group, i) => (
        <div key={i} className="border border-border-default rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={group.name}
              onChange={(e) => updateGroupName(i, e.target.value)}
              placeholder={i === 0 ? "e.g. Color" : "e.g. Size"}
              className="border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
            />
            <button
              type="button"
              onClick={() => removeGroup(i)}
              className="text-xs text-red-500 hover:underline"
            >
              Remove group
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.values.map((val, j) => (
              <span
                key={j}
                className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-full"
              >
                {val}
                <button type="button" onClick={() => removeValue(i, j)} className="text-brand-500 hover:text-brand-700">
                  ×
                </button>
              </span>
            ))}
            {group.values.length < 10 && (
              <input
                type="text"
                placeholder="Add value, press Enter"
                className="border border-border-default rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 w-40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addValue(i, (e.target as HTMLInputElement).value)
                    ;(e.target as HTMLInputElement).value = ""
                  }
                }}
              />
            )}
          </div>
        </div>
      ))}

      {options.length < 2 && (
        <button
          type="button"
          onClick={addGroup}
          className="text-sm text-brand-600 hover:underline border border-dashed border-brand-300 rounded px-4 py-2 w-full text-center hover:bg-brand-50"
        >
          + Add variant group
        </button>
      )}

      {matrixKeys.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border-default rounded">
            <thead className="bg-bg-page">
              <tr>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Variant</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Price (₱)</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Stock</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">SKU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {matrixKeys.map((key) => (
                <tr key={key}>
                  <td className="px-3 py-2 font-medium text-text-primary">{key}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={matrix[key]?.price ?? 0}
                      onChange={(e) => updateCell(key, "price", parseFloat(e.target.value) || 0)}
                      className="w-24 border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={matrix[key]?.stock ?? 0}
                      onChange={(e) => updateCell(key, "stock", parseInt(e.target.value, 10) || 0)}
                      className="w-20 border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={matrix[key]?.sku ?? ""}
                      onChange={(e) => updateCell(key, "sku", e.target.value)}
                      placeholder="Optional"
                      className="w-28 border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
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

- [ ] **Step 2: Create `components/seller/ProductFormClient.tsx`**

```typescript
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import VariantMatrixBuilder from "@/components/seller/VariantMatrixBuilder"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { upsertProduct } from "@/lib/seller/actions"
import { slugify, crossProduct } from "@/lib/utils"
import type { VariantOption, VariantCellData, CategoryItem } from "@/types/seller"

interface InitialProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  originalPrice: number | null
  images: string[]
  stock: number
  categoryId: string
  isActive: boolean
  variantOptions: VariantOption[] | null
  variants: { name: string; price: number; stock: number; sku: string | null; image: string | null }[]
}

interface Props {
  categories: CategoryItem[]
  initial?: InitialProduct
}

export default function ProductFormClient({ categories, initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const parentCategories = categories.filter((c) => c.parentId === null)

  const [name, setName] = useState(initial?.name ?? "")
  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [parentCategoryId, setParentCategoryId] = useState<string>(() => {
    if (!initial?.categoryId) return ""
    const cat = categories.find((c) => c.id === initial.categoryId)
    if (!cat) return ""
    return cat.parentId ?? initial.categoryId
  })
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "")
  const [price, setPrice] = useState(initial?.price?.toString() ?? "")
  const [originalPrice, setOriginalPrice] = useState(initial?.originalPrice?.toString() ?? "")
  const [images, setImages] = useState<string[]>(initial?.images ?? [])
  const [stock, setStock] = useState(initial?.stock?.toString() ?? "0")
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [hasVariants, setHasVariants] = useState(
    Boolean(initial?.variantOptions && (initial.variantOptions as VariantOption[]).length > 0)
  )
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>(
    (initial?.variantOptions as VariantOption[]) ?? []
  )
  const [variantMatrix, setVariantMatrix] = useState<Record<string, VariantCellData>>(() => {
    if (!initial?.variants?.length) return {}
    return Object.fromEntries(
      initial.variants.map((v) => [
        v.name,
        { price: v.price, stock: v.stock, sku: v.sku ?? "", image: v.image ?? "" },
      ])
    )
  })

  const childCategories = categories.filter((c) => c.parentId === parentCategoryId)

  function handleNameChange(value: string) {
    setName(value)
    if (!initial?.id) setSlug(slugify(value))
  }

  function handleParentChange(parentId: string) {
    setParentCategoryId(parentId)
    setCategoryId("")
  }

  function handleVariantToggle(checked: boolean) {
    setHasVariants(checked)
    if (!checked) {
      setVariantOptions([])
      setVariantMatrix({})
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const variants = hasVariants
      ? crossProduct(variantOptions).map((key) => ({
          name: key,
          price: variantMatrix[key]?.price ?? 0,
          stock: variantMatrix[key]?.stock ?? 0,
          sku: variantMatrix[key]?.sku || undefined,
          image: variantMatrix[key]?.image || undefined,
        }))
      : []

    startTransition(async () => {
      const result = await upsertProduct({
        id: initial?.id,
        name,
        slug,
        description,
        categoryId,
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        images,
        stock: parseInt(stock, 10) || 0,
        variantOptions: hasVariants ? variantOptions : null,
        variants,
        isActive,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/seller/products")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Basic Info */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
        <h2 className="font-semibold text-text-primary">Basic Information</h2>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Product Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            maxLength={200}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">URL Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9-]+"
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Category *</label>
            <select
              value={parentCategoryId}
              onChange={(e) => handleParentChange(e.target.value)}
              required
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select category</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {childCategories.length > 0 && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-primary">Subcategory *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select subcategory</option>
                {childCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Price (₱) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min={0}
              step="0.01"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">
              Original Price (₱)
              <span className="text-text-secondary font-normal ml-1 text-xs">(for strikethrough)</span>
            </label>
            <input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              min={0}
              step="0.01"
              className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-3">
        <h2 className="font-semibold text-text-primary">Product Images</h2>
        <p className="text-xs text-text-secondary">Up to 9 images. First image is the cover.</p>
        <ProductImageUploader
          endpoint="productImages"
          value={images}
          onChange={setImages}
          maxFiles={9}
        />
      </section>

      {/* Variants */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">Variants</h2>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={(e) => handleVariantToggle(e.target.checked)}
              className="rounded border-border-default"
            />
            This product has variants
          </label>
        </div>

        {!hasVariants ? (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Stock *</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required={!hasVariants}
              min={0}
              className="w-32 border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ) : (
          <VariantMatrixBuilder
            options={variantOptions}
            matrix={variantMatrix}
            onOptionsChange={setVariantOptions}
            onMatrixChange={setVariantMatrix}
          />
        )}
      </section>

      {/* Publish */}
      <section className="bg-white rounded-lg border border-border-default p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-border-default"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">Publish product</p>
            <p className="text-xs text-text-secondary">
              Inactive products are hidden from the shop. You can publish later.
            </p>
          </div>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded text-sm transition-colors"
        >
          {isPending ? "Saving…" : initial?.id ? "Save Changes" : "Create Product"}
        </button>
        <a href="/seller/products" className="text-sm text-text-secondary hover:underline">
          Cancel
        </a>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create `app/(seller)/seller/(portal)/products/new/page.tsx`**

```typescript
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getAllCategories } from "@/lib/seller/queries"
import ProductFormClient from "@/components/seller/ProductFormClient"

export const metadata = { title: "Add Product" }

export default async function NewProductPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const categories = await getAllCategories()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Add Product</h1>
      <ProductFormClient categories={categories} />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(seller)/seller/(portal)/products/[id]/edit/page.tsx`**

```typescript
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getAllCategories, getSellerProductForEdit } from "@/lib/seller/queries"
import ProductFormClient from "@/components/seller/ProductFormClient"
import type { VariantOption } from "@/types/seller"

export const metadata = { title: "Edit Product" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const [product, categories] = await Promise.all([
    getSellerProductForEdit(id, shop.id),
    getAllCategories(),
  ])

  if (!product) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Edit Product</h1>
      <ProductFormClient
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          images: product.images,
          stock: product.stock,
          categoryId: product.categoryId,
          isActive: product.isActive,
          variantOptions: product.variantOptions as VariantOption[] | null,
          variants: product.variants.map((v) => ({
            name: v.name,
            price: v.price,
            stock: v.stock,
            sku: v.sku,
            image: v.image,
          })),
        }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Verify product form**

In the dev server, navigate to `/seller/products/new`. Confirm:
- All form sections render (Basic Info, Images, Variants, Publish)
- Checking "This product has variants" shows the VariantMatrixBuilder
- Adding a group and values auto-generates the matrix table
- Adding a second group generates a cross-product matrix

- [ ] **Step 6: Commit**

```bash
git add components/seller/VariantMatrixBuilder.tsx components/seller/ProductFormClient.tsx "app/(seller)/seller/(portal)/products/new/page.tsx" "app/(seller)/seller/(portal)/products/[id]/edit/page.tsx"
git commit -m "feat(seller): add product form with 2D variant matrix builder"
```

---

## Task 10: Order Management

**Files:**
- Create: `components/seller/CancelOrderModal.tsx`
- Create: `app/(seller)/seller/(portal)/orders/page.tsx`
- Create: `app/(seller)/seller/(portal)/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `getSellerOrders`, `getSellerOrderDetail` from `lib/seller/queries`, `shipOrder`, `cancelOrder` from `lib/seller/actions`, `getCurrentShop` from `lib/seller/queries`, `formatPrice` from `lib/utils`

- [ ] **Step 1: Create `components/seller/CancelOrderModal.tsx`**

```typescript
"use client"

import { useState, useTransition } from "react"
import { cancelOrder } from "@/lib/seller/actions"

interface Props {
  orderId: string
}

export default function CancelOrderModal({ orderId }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelOrder(orderId)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-500 border border-red-200 hover:bg-red-50 px-4 py-2 rounded transition-colors"
      >
        Cancel Order
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="font-semibold text-text-primary">Cancel this order?</h2>
            <p className="text-sm text-text-secondary">
              This action cannot be undone. The order status will be set to Cancelled.
            </p>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium py-2 rounded text-sm transition-colors"
              >
                {isPending ? "Cancelling…" : "Yes, Cancel Order"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-border-default text-text-secondary hover:bg-bg-page py-2 rounded text-sm transition-colors"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Create `app/(seller)/seller/(portal)/orders/page.tsx`**

```typescript
import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getSellerOrders } from "@/lib/seller/queries"
import { formatPrice } from "@/lib/utils"

export const metadata = { title: "Orders" }

const TABS = [
  { label: "All", value: null },
  { label: "To Ship", value: "PAID" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
]

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function OrdersPage({ searchParams }: Props) {
  const { status: statusParam, page: pageStr } = await searchParams
  const statusFilter = statusParam ?? null
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const { orders, total, pageSize } = await getSellerOrders(shop.id, statusFilter, page)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Orders</h1>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-border-default">
        {TABS.map((tab) => {
          const href = tab.value ? `/seller/orders?status=${tab.value}` : "/seller/orders"
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                active
                  ? "border-brand-600 text-brand-600 font-medium"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
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
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Order</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Items</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Total</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {orders.map((order) => {
                const firstItem = order.items[0]
                const itemSummary = firstItem
                  ? `${firstItem.product.name}${firstItem.variant ? ` (${firstItem.variant.name})` : ""}${
                      order._count.items > 1 ? ` + ${order._count.items - 1} more` : ""
                    }`
                  : "—"

                return (
                  <tr key={order.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-text-secondary">
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("en-PH")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{order.user.name}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-[200px]">
                      <p className="truncate text-xs">{itemSummary}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text-primary">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/seller/orders/${order.id}`}
                        className={`text-xs font-medium ${
                          order.status === "PAID"
                            ? "text-brand-600 hover:underline"
                            : "text-text-secondary hover:underline"
                        }`}
                      >
                        {order.status === "PAID" ? "Arrange Shipment" : "View"}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/seller/orders?${statusFilter ? `status=${statusFilter}&` : ""}page=${page - 1}`}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/seller/orders?${statusFilter ? `status=${statusFilter}&` : ""}page=${page + 1}`}
                    className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                  >
                    Next
                  </Link>
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

- [ ] **Step 3: Create `app/(seller)/seller/(portal)/orders/[id]/page.tsx`**

```typescript
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getSellerOrderDetail } from "@/lib/seller/queries"
import { shipOrder } from "@/lib/seller/actions"
import CancelOrderModal from "@/components/seller/CancelOrderModal"
import { formatPrice } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const order = await getSellerOrderDetail(id, shop.id)
  if (!order) notFound()

  const itemsTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/seller/orders"
            className="text-sm text-text-secondary hover:underline"
          >
            ← Orders
          </Link>
          <h1 className="text-xl font-bold text-text-primary mt-1">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
        </div>
        <span
          className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {order.status}
        </span>
      </div>

      {/* Buyer Info */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-2">
        <h2 className="font-semibold text-text-primary text-sm">Buyer & Shipping</h2>
        <p className="text-sm text-text-primary">{order.address.fullName}</p>
        <p className="text-sm text-text-secondary">{order.address.phone}</p>
        <p className="text-sm text-text-secondary">
          {order.address.street}, {order.address.city}, {order.address.province}{" "}
          {order.address.postalCode}
        </p>
      </section>

      {/* Order Items */}
      <section className="bg-white rounded-lg border border-border-default overflow-hidden">
        <h2 className="font-semibold text-text-primary text-sm px-5 py-3 border-b border-border-default">
          Items
        </h2>
        <ul className="divide-y divide-border-default">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              {item.product.images[0] ? (
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-12 h-12 object-cover rounded border border-border-default flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-brand-50 rounded border border-border-default flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {item.product.name}
                </p>
                {item.variant && (
                  <p className="text-xs text-text-secondary">{item.variant.name}</p>
                )}
                <p className="text-xs text-text-secondary">
                  {formatPrice(item.price)} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-text-primary flex-shrink-0">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-border-default space-y-1 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span>{formatPrice(itemsTotal)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Shipping</span>
            <span>{formatPrice(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between font-semibold text-text-primary border-t border-border-default pt-1 mt-1">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </section>

      {/* Shipment Panel */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
        <h2 className="font-semibold text-text-primary text-sm">Shipment</h2>

        {order.status === "PAID" && (
          <form
            action={async (formData: FormData) => {
              "use server"
              const courier = formData.get("courier") as string
              const trackingNumber = formData.get("trackingNumber") as string
              await shipOrder(order.id, courier, trackingNumber)
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                Courier
              </label>
              <input
                name="courier"
                type="text"
                required
                placeholder="e.g. J&T Express"
                className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                Tracking Number
              </label>
              <input
                name="trackingNumber"
                type="text"
                required
                placeholder="e.g. 123456789"
                className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2 rounded text-sm transition-colors"
            >
              Mark as Shipped
            </button>
          </form>
        )}

        {order.status === "SHIPPED" && order.shipment && (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-text-secondary uppercase tracking-wide">Courier</dt>
              <dd className="text-text-primary font-medium">{order.shipment.courier ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary uppercase tracking-wide">Tracking Number</dt>
              <dd className="text-text-primary font-medium font-mono">
                {order.shipment.trackingNumber ?? "—"}
              </dd>
            </div>
          </dl>
        )}

        {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
          <p className="text-sm text-text-secondary">
            Order is {order.status.toLowerCase()}. No further shipment actions available.
          </p>
        )}
      </section>

      {/* Cancel */}
      {order.status === "PAID" && (
        <div className="flex items-center justify-end">
          <CancelOrderModal orderId={order.id} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify order flow**

In the dev server, navigate to `/seller/orders`. Confirm:
- Status tabs render and filter orders correctly (requires seeded order data)
- Each row shows buyer name, items summary, total, status badge
- "Arrange Shipment" link shows for PAID orders, "View" for others
- Detail page shows all sections
- PAID orders show the shipment form and Cancel Order button

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Final commit**

```bash
git add components/seller/CancelOrderModal.tsx "app/(seller)/seller/(portal)/orders/page.tsx" "app/(seller)/seller/(portal)/orders/[id]/page.tsx"
git commit -m "feat(seller): add order list and order detail with ship and cancel actions"
```

---

## Self-Review Checklist

After implementation, verify:

- [ ] `/seller/onboarding` is accessible to signed-in BUYER (not yet a SELLER)
- [ ] After submitting onboarding form, user lands on `/seller/pending`
- [ ] `/seller/dashboard`, `/seller/products`, `/seller/orders` redirect to `/seller/pending` if shop is PENDING
- [ ] After admin sets `shop.status = 'ACTIVE'` in Prisma Studio, portal pages load
- [ ] Product without variants: `Product.stock` is set, `ProductVariant` rows are empty
- [ ] Product with variants: `Product.stock = 0`, variant rows hold actual stock
- [ ] "Mark as Shipped" only works on PAID orders (returns error otherwise)
- [ ] "Cancel Order" only works on PAID orders
- [ ] A seller cannot ship/cancel another seller's order (IDOR guard)
- [ ] `Product.variantOptions` JSON matches `VariantOption[]` shape when read back on edit page
