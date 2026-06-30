# Phase 8: Reviews & Ratings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verified-purchase product reviews, star ratings, and seller replies — buyers rate from their orders page via a modal, reviews appear on the product page, sellers reply from their portal.

**Architecture:** Buyers access reviews from `/account/orders` (new My Purchases page) via a client-side modal triggered per delivered order item. Reviews are stored with a Prisma transaction that also updates denormalized `Product.rating` and `Product.reviewCount`. Sellers manage replies in a new `/seller/reviews` portal page.

**Tech Stack:** Next.js 15 App Router, Prisma 7 (generated client at `@/lib/generated/prisma/client`), Clerk auth, Tailwind CSS, Vitest.

## Global Constraints

- No Prisma migrations needed — `Review` and `ReviewReply` models already exist in the schema.
- Verified purchases only: buyer must have a DELIVERED order containing the product.
- One review per (userId, productId) — enforced in the server action.
- Reviews are permanent — no edit or delete.
- One reply per review — `ReviewReply.reviewId` is `@unique` in the schema.
- All monetary values formatted as `₱` (Philippine Peso), locale `en-PH`.
- Prisma client imported from `@/lib/db` (re-exported from the generated client — this is the project convention).
- Use `text-reward` for orange star color, `text-brand-*`/`bg-brand-*` for primary, `text-text-primary`, `text-text-secondary`, `border-border-default`, `bg-bg-page` for semantic colors.
- Path alias `@/` maps to project root.
- Server actions return `{ error?: string }` — consistent with `lib/seller/actions.ts` pattern.
- `getCurrentUser()` from `@/lib/data/user` returns the DB user.
- `getVerifiedShop()` is a private helper already in `lib/seller/actions.ts` — do not duplicate it; `replyToReview` must live in the same file.
- Task 3 (StarPicker + ReviewModal) MUST be completed before Task 4 (RateButton imports ReviewModal).

---

### Task 1: Types + Data Query Functions

**Files:**
- Modify: `types/index.ts`
- Create: `lib/data/reviews.ts`
- Create: `lib/data/orders.ts`
- Create: `tests/data/reviews.test.ts`

**Interfaces:**
- Produces:
  - `ReviewWithUser` — used by `getProductReviews`, `ReviewCard`, `ReviewsList`
  - `ShopReviewWithProduct` — used by `getShopReviews`, `ReviewsList`
  - `OrderWithItems` — used by `getBuyerOrders`, `OrderCard`
  - `getProductReviews(productId, page?)` → `Promise<ReviewWithUser[]>`
  - `getUserReviewedProductIds(userId)` → `Promise<Set<string>>`
  - `getProductRatingStats(productId)` → `Promise<Record<number, number>>`
  - `getBuyerOrders(userId)` → `Promise<OrderWithItems[]>`

- [ ] **Step 1: Write failing tests**

Create `tests/data/reviews.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const prisma = {
    review: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  }
  return { prisma }
})

describe("getProductReviews", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns reviews ordered by createdAt desc, page 1", async () => {
    const { prisma } = await import("@/lib/db")
    const mockReviews = [
      { id: "r1", rating: 5, comment: "Great!", createdAt: new Date(), user: { name: "Alice" }, reply: null },
    ]
    vi.mocked(prisma.review.findMany).mockResolvedValue(mockReviews as any)

    const { getProductReviews } = await import("@/lib/data/reviews")
    const result = await getProductReviews("prod-1")

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "prod-1" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      })
    )
    expect(result).toEqual(mockReviews)
  })

  it("skips correctly for page 2", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.review.findMany).mockResolvedValue([])

    const { getProductReviews } = await import("@/lib/data/reviews")
    await getProductReviews("prod-1", 2)

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10 })
    )
  })
})

describe("getProductRatingStats", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns counts keyed by star rating with zeroes for missing stars", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.review.groupBy).mockResolvedValue([
      { rating: 5, _count: { _all: 8 } },
      { rating: 4, _count: { _all: 2 } },
    ] as any)

    const { getProductRatingStats } = await import("@/lib/data/reviews")
    const result = await getProductRatingStats("prod-1")

    expect(result).toEqual({ 1: 0, 2: 0, 3: 0, 4: 2, 5: 8 })
  })
})
```

- [ ] **Step 2: Run tests to see them fail**

```
npx vitest run tests/data/reviews.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/data/reviews'`

- [ ] **Step 3: Add types to `types/index.ts`**

Append to the end of `types/index.ts`:

```ts
export interface ReviewWithUser {
  id: string
  rating: number
  comment: string | null
  createdAt: Date
  user: { name: string }
  reply: { comment: string } | null
}

export interface ShopReviewWithProduct {
  id: string
  rating: number
  comment: string | null
  createdAt: Date
  user: { name: string }
  product: { id: string; name: string; images: string[] }
  reply: { comment: string } | null
}

export interface OrderWithItems {
  id: string
  status: string
  total: number
  createdAt: Date
  shop: { name: string; slug: string }
  items: {
    id: string
    quantity: number
    price: number
    product: { id: string; name: string; slug: string; images: string[] }
    variant: { name: string } | null
  }[]
}
```

- [ ] **Step 4: Create `lib/data/reviews.ts`**

```ts
import { cache } from "react"
import { prisma } from "@/lib/db"
import type { ReviewWithUser } from "@/types"

const PAGE_SIZE = 10

export const getProductReviews = cache(async (productId: string, page = 1): Promise<ReviewWithUser[]> => {
  return prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
      reply: { select: { comment: true } },
    },
  })
})

export const getUserReviewedProductIds = cache(async (userId: string): Promise<Set<string>> => {
  const reviews = await prisma.review.findMany({
    where: { userId },
    select: { productId: true },
  })
  return new Set(reviews.map((r) => r.productId))
})

export const getProductRatingStats = cache(async (productId: string): Promise<Record<number, number>> => {
  const groups = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId },
    _count: { _all: true },
  })
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const g of groups) {
    counts[g.rating] = g._count._all
  }
  return counts
})
```

- [ ] **Step 5: Create `lib/data/orders.ts`**

```ts
import { cache } from "react"
import { prisma } from "@/lib/db"
import type { OrderWithItems } from "@/types"

export const getBuyerOrders = cache(async (userId: string): Promise<OrderWithItems[]> => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      shop: { select: { name: true, slug: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          product: { select: { id: true, name: true, slug: true, images: true } },
          variant: { select: { name: true } },
        },
      },
    },
  })
})
```

- [ ] **Step 6: Run tests to verify they pass**

```
npx vitest run tests/data/reviews.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```
git add types/index.ts lib/data/reviews.ts lib/data/orders.ts tests/data/reviews.test.ts
git commit -m "feat(reviews): add review types and data query functions"
```

---

### Task 2: `submitReview` Server Action

**Files:**
- Create: `lib/actions/reviews.ts`
- Create: `tests/actions/reviews.test.ts`

**Interfaces:**
- Consumes: `getCurrentUser()` from `@/lib/data/user`, `prisma` from `@/lib/db`
- Produces: `submitReview(data)` → `Promise<{ error?: string }>`
  - `data: { productId: string; productSlug: string; orderId: string; rating: number; comment: string }`

- [ ] **Step 1: Write failing tests**

Create `tests/actions/reviews.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/data/user", () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const mockTx = {
  review: {
    create: vi.fn(),
    aggregate: vi.fn().mockResolvedValue({ _avg: { rating: 4.5 } }),
    count: vi.fn().mockResolvedValue(2),
  },
  product: { update: vi.fn() },
}

vi.mock("@/lib/db", () => ({
  prisma: {
    orderItem: { findFirst: vi.fn() },
    review: { findFirst: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn(mockTx)),
  },
}))

describe("submitReview", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when not authenticated", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "p-slug", orderId: "o1", rating: 5, comment: "" })

    expect(result).toEqual({ error: "Sign in to leave a review" })
  })

  it("returns error for invalid rating", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "BUYER" } as any)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "p-slug", orderId: "o1", rating: 0, comment: "" })

    expect(result).toEqual({ error: "Rating must be 1–5" })
  })

  it("returns error when no qualifying delivered order found", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "BUYER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(null)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "p-slug", orderId: "o1", rating: 4, comment: "" })

    expect(result).toEqual({ error: "You can only review products from delivered orders" })
  })

  it("returns error when review already exists", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "BUYER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: "oi1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue({ id: "r1" } as any)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "p-slug", orderId: "o1", rating: 4, comment: "" })

    expect(result).toEqual({ error: "You have already reviewed this product" })
  })

  it("creates review and updates product rating on success", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "BUYER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: "oi1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue(null)

    const { submitReview } = await import("@/lib/actions/reviews")
    const result = await submitReview({ productId: "p1", productSlug: "prod-slug", orderId: "o1", rating: 5, comment: "Great!" })

    expect(result).toEqual({})
    expect(mockTx.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", productId: "p1", rating: 5, comment: "Great!" }),
      })
    )
    expect(mockTx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: { rating: 4.5, reviewCount: 2 },
      })
    )
  })
})
```

- [ ] **Step 2: Run tests to see them fail**

```
npx vitest run tests/actions/reviews.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/actions/reviews'`

- [ ] **Step 3: Create `lib/actions/reviews.ts`**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"

export async function submitReview(data: {
  productId: string
  productSlug: string
  orderId: string
  rating: number
  comment: string
}): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to leave a review" }

  const { productId, productSlug, orderId, rating, comment } = data

  if (rating < 1 || rating > 5) return { error: "Rating must be 1–5" }

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      orderId,
      productId,
      order: { userId: user.id, status: "DELIVERED" },
    },
  })
  if (!orderItem) return { error: "You can only review products from delivered orders" }

  const existing = await prisma.review.findFirst({
    where: { userId: user.id, productId },
  })
  if (existing) return { error: "You have already reviewed this product" }

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        userId: user.id,
        productId,
        orderId,
        rating,
        comment: comment.trim() || null,
        images: [],
      },
    })

    const [avgResult, count] = await Promise.all([
      tx.review.aggregate({ where: { productId }, _avg: { rating: true } }),
      tx.review.count({ where: { productId } }),
    ])

    await tx.product.update({
      where: { id: productId },
      data: {
        rating: avgResult._avg.rating ?? 0,
        reviewCount: count,
      },
    })
  })

  revalidatePath(`/product/${productSlug}`)
  revalidatePath("/account/orders")

  return {}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/actions/reviews.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```
git add lib/actions/reviews.ts tests/actions/reviews.test.ts
git commit -m "feat(reviews): add submitReview server action with validation"
```

---

### Task 3: StarPicker + ReviewModal

**Files:**
- Create: `components/reviews/StarPicker.tsx`
- Create: `components/reviews/ReviewModal.tsx`

**Interfaces:**
- Consumes: `submitReview` from `@/lib/actions/reviews`
- Produces:
  - `<StarPicker value={number} onChange={(n) => void} />` — client component
  - `<ReviewModal productId productSlug productName orderId onClose />` — client component; imported by `RateButton` in Task 4

- [ ] **Step 1: Create `components/reviews/StarPicker.tsx`**

```tsx
"use client"

const LABELS = ["", "Terrible", "Fair", "Good", "Very Good", "Excellent"]

interface StarPickerProps {
  value: number
  onChange: (value: number) => void
}

export function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-3xl leading-none focus:outline-none transition-colors"
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          >
            <span className={star <= value ? "text-reward" : "text-gray-300"}>★</span>
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-sm text-text-secondary">{LABELS[value]}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/reviews/ReviewModal.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { StarPicker } from "@/components/reviews/StarPicker"
import { submitReview } from "@/lib/actions/reviews"

interface ReviewModalProps {
  productId: string
  productSlug: string
  productName: string
  orderId: string
  onClose: () => void
}

export function ReviewModal({ productId, productSlug, productName, orderId, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (rating === 0) return
    setError(null)
    startTransition(async () => {
      const result = await submitReview({ productId, productSlug, orderId, rating, comment })
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Rate this product</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-text-secondary line-clamp-2">{productName}</p>

        <StarPicker value={rating} onChange={setRating} />

        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Share your experience (optional)"
            rows={4}
            className="w-full border border-border-default rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-text-secondary text-right mt-0.5">{comment.length}/500</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isPending}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded transition-colors text-sm"
        >
          {isPending ? "Submitting…" : "Submit Review"}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```
git add components/reviews/StarPicker.tsx components/reviews/ReviewModal.tsx
git commit -m "feat(reviews): add StarPicker and ReviewModal components"
```

---

### Task 4: My Purchases Page + OrderCard + RateButton

**Files:**
- Create: `app/(shop)/account/orders/page.tsx`
- Create: `app/(shop)/account/orders/loading.tsx`
- Create: `components/account/OrderCard.tsx`
- Create: `components/reviews/RateButton.tsx`

**Interfaces:**
- Consumes:
  - `getBuyerOrders(userId)` from `@/lib/data/orders`
  - `getUserReviewedProductIds(userId)` from `@/lib/data/reviews`
  - `OrderWithItems` from `@/types`
  - `<ReviewModal />` from Task 3 (must be complete first — `RateButton` imports it)
- Produces:
  - `<OrderCard order={OrderWithItems} reviewedProductIds={Set<string>} />` — server component
  - `<RateButton productId productSlug productName orderId />` — client component; opens ReviewModal

- [ ] **Step 1: Create `components/reviews/RateButton.tsx`**

```tsx
"use client"

import { useState } from "react"
import { ReviewModal } from "@/components/reviews/ReviewModal"

interface RateButtonProps {
  productId: string
  productSlug: string
  productName: string
  orderId: string
}

export function RateButton({ productId, productSlug, productName, orderId }: RateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs border border-brand-600 text-brand-600 hover:bg-brand-50 rounded px-3 py-1.5 transition-colors font-medium"
      >
        Rate
      </button>
      {open && (
        <ReviewModal
          productId={productId}
          productSlug={productSlug}
          productName={productName}
          orderId={orderId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Create `components/account/OrderCard.tsx`**

```tsx
import Image from "next/image"
import { RateButton } from "@/components/reviews/RateButton"
import type { OrderWithItems } from "@/types"

interface OrderCardProps {
  order: OrderWithItems
  reviewedProductIds: Set<string>
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export function OrderCard({ order, reviewedProductIds }: OrderCardProps) {
  return (
    <div className="bg-white border border-border-default rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-page">
        <span className="text-sm font-medium text-text-primary">{order.shop.name}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="divide-y divide-border-default">
        {order.items.map((item) => {
          const isDelivered = order.status === "DELIVERED"
          const hasReviewed = reviewedProductIds.has(item.product.id)
          const image = item.product.images[0]

          return (
            <div key={item.id} className="flex items-center gap-4 px-4 py-4">
              {image && (
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image src={image} alt={item.product.name} fill className="object-cover rounded" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary line-clamp-2">{item.product.name}</p>
                {item.variant && (
                  <p className="text-xs text-text-secondary mt-0.5">{item.variant.name}</p>
                )}
                <p className="text-xs text-text-secondary mt-0.5">Qty: {item.quantity}</p>
              </div>
              <div className="flex-shrink-0">
                {isDelivered && !hasReviewed && (
                  <RateButton
                    productId={item.product.id}
                    productSlug={item.product.slug}
                    productName={item.product.name}
                    orderId={order.id}
                  />
                )}
                {isDelivered && hasReviewed && (
                  <span className="text-xs text-text-secondary border border-border-default rounded px-2 py-1">
                    Reviewed
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-border-default flex items-center justify-between text-xs text-text-secondary">
        <span>
          {new Date(order.createdAt).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className="font-medium text-text-primary">
          Total: ₱{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(shop)/account/orders/loading.tsx`**

```tsx
export default function OrdersLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-border-default rounded-lg h-40 animate-pulse" />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(shop)/account/orders/page.tsx`**

```tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getBuyerOrders } from "@/lib/data/orders"
import { getUserReviewedProductIds } from "@/lib/data/reviews"
import { OrderCard } from "@/components/account/OrderCard"

export const metadata = { title: "My Purchases | Eshopee" }

export default async function OrdersPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const [orders, reviewedIds] = await Promise.all([
    getBuyerOrders(user.id),
    getUserReviewedProductIds(user.id),
  ])

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-text-secondary">
        <p className="text-lg font-medium">No orders yet.</p>
        <p className="text-sm mt-1">Your purchased items will appear here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">My Purchases</h1>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} reviewedProductIds={reviewedIds} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Manual verification**

Navigate to `/account/orders` while signed in. Confirm:
- Orders list renders with correct status badge per order.
- Delivered orders with unreviewed products show the orange "Rate" button.
- Clicking "Rate" opens the modal with product name, star picker, and comment box.
- Stars fill orange on selection; label shows ("Terrible" → "Excellent").
- Submit button disabled until a star is selected.
- On successful submit, modal closes and "Rate" becomes "Reviewed" badge.
- Already-reviewed products show the grey "Reviewed" badge with no button.
- Clicking outside the modal closes it.

- [ ] **Step 6: Commit**

```
git add "app/(shop)/account/orders/" components/account/OrderCard.tsx components/reviews/RateButton.tsx
git commit -m "feat(reviews): add My Purchases page with Rate/Reviewed flow"
```

---

### Task 5: Product Page Reviews Section

**Files:**
- Create: `components/product/ReviewCard.tsx`
- Create: `components/product/RatingBreakdown.tsx`
- Create: `components/product/ReviewsSection.tsx`
- Modify: `app/(shop)/product/[slug]/page.tsx`

**Interfaces:**
- Consumes:
  - `getProductReviews(productId)` from `@/lib/data/reviews`
  - `getProductRatingStats(productId)` from `@/lib/data/reviews`
  - `ReviewWithUser` from `@/types`
  - `product.rating` (Float) and `product.reviewCount` (Int) from `ProductDetail` (already in `getProductBySlug` return)
- Produces: `<ReviewsSection productId productRating productReviewCount />` — async server component

- [ ] **Step 1: Create `components/product/ReviewCard.tsx`**

```tsx
import type { ReviewWithUser } from "@/types"

interface ReviewCardProps {
  review: ReviewWithUser
}

export function ReviewCard({ review }: ReviewCardProps) {
  const initial = review.user.name.charAt(0).toUpperCase()
  const firstName = review.user.name.split(" ")[0]

  return (
    <div className="py-4 border-b border-border-default last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{firstName}</span>
            <span className="text-xs text-text-secondary">
              {new Date(review.createdAt).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={s <= review.rating ? "text-reward" : "text-gray-300"}>
                ★
              </span>
            ))}
          </div>
          {review.comment && (
            <p className="text-sm text-text-primary mt-1.5 leading-relaxed">{review.comment}</p>
          )}
          {review.reply && (
            <div className="mt-3 ml-2 pl-3 border-l-2 border-border-default bg-bg-page rounded-r px-3 py-2">
              <p className="text-xs font-medium text-text-secondary mb-1">Shop's response:</p>
              <p className="text-sm text-text-primary">{review.reply.comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/product/RatingBreakdown.tsx`**

```tsx
interface RatingBreakdownProps {
  overallRating: number
  totalCount: number
  ratingCounts: Record<number, number>
}

export function RatingBreakdown({ overallRating, totalCount, ratingCounts }: RatingBreakdownProps) {
  return (
    <div className="flex gap-6 items-center">
      <div className="text-center">
        <p className="text-5xl font-bold text-reward">{overallRating.toFixed(1)}</p>
        <p className="text-sm text-text-secondary mt-1">
          {totalCount} review{totalCount !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingCounts[star] ?? 0
          const pct = totalCount > 0 ? (count / totalCount) * 100 : 0
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="w-4 text-right">{star}</span>
              <span className="text-reward">★</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-reward h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/product/ReviewsSection.tsx`**

```tsx
import { getProductReviews, getProductRatingStats } from "@/lib/data/reviews"
import { RatingBreakdown } from "./RatingBreakdown"
import { ReviewCard } from "./ReviewCard"

interface ReviewsSectionProps {
  productId: string
  productRating: number
  productReviewCount: number
}

export async function ReviewsSection({ productId, productRating, productReviewCount }: ReviewsSectionProps) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-text-primary mb-4">Product Ratings &amp; Reviews</h2>
      {productReviewCount === 0 ? (
        <p className="text-sm text-text-secondary">
          No reviews yet. Be the first to review this product.
        </p>
      ) : (
        <ReviewsContent
          productId={productId}
          productRating={productRating}
          productReviewCount={productReviewCount}
        />
      )}
    </div>
  )
}

async function ReviewsContent({ productId, productRating, productReviewCount }: ReviewsSectionProps) {
  const [reviews, ratingCounts] = await Promise.all([
    getProductReviews(productId),
    getProductRatingStats(productId),
  ])

  return (
    <>
      <RatingBreakdown
        overallRating={productRating}
        totalCount={productReviewCount}
        ratingCounts={ratingCounts}
      />
      <div className="mt-5">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Wire `ReviewsSection` into the product page**

In `app/(shop)/product/[slug]/page.tsx`, add the import:

```tsx
import { ReviewsSection } from "@/components/product/ReviewsSection"
```

Then inside the right-column `<div className="space-y-5">`, add `<ReviewsSection>` after the description block:

```tsx
{/* Description */}
<div>
  <h2 className="text-sm font-semibold text-text-primary mb-2">Product Description</h2>
  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
    {product.description}
  </p>
</div>

<ReviewsSection
  productId={product.id}
  productRating={product.rating}
  productReviewCount={product.reviewCount}
/>
```

- [ ] **Step 5: Manual verification**

Open any product page. Confirm:
- When `reviewCount === 0`: shows "No reviews yet. Be the first to review this product."
- When reviews exist: large orange rating number, 5-bar breakdown (bars sized by percentage), then review cards.
- Each card: avatar initial circle, buyer first name, filled/hollow stars, comment text, date.
- If a review has a seller reply: indented grey block with "Shop's response:" prefix.
- After submitting a review from `/account/orders`, refresh the product page — the rating number and count update.

- [ ] **Step 6: Commit**

```
git add components/product/ReviewCard.tsx components/product/RatingBreakdown.tsx components/product/ReviewsSection.tsx "app/(shop)/product/[slug]/page.tsx"
git commit -m "feat(reviews): add reviews section to product page"
```

---

### Task 6: Seller Reviews Portal

**Files:**
- Modify: `lib/seller/queries.ts`
- Modify: `lib/seller/actions.ts`
- Create: `components/seller/ReplyForm.tsx`
- Create: `components/seller/ReviewsList.tsx`
- Create: `app/(seller)/seller/(portal)/reviews/page.tsx`
- Modify: `components/seller/SellerSidebar.tsx`
- Create: `tests/seller/replyToReview.test.ts`

**Interfaces:**
- Consumes:
  - `getVerifiedShop()` (private helper already in `lib/seller/actions.ts` — add `replyToReview` to the same file)
  - `getCurrentShop()` from `@/lib/seller/queries`
  - `ShopReviewWithProduct` from `@/types`
- Produces:
  - `getShopReviews(shopId)` → `Promise<ShopReviewWithProduct[]>`
  - `replyToReview(reviewId, comment)` → `Promise<{ error?: string }>`
  - `<ReviewsList reviews={ShopReviewWithProduct[]} />`
  - `<ReplyForm reviewId={string} />`

- [ ] **Step 1: Write failing tests for `replyToReview`**

Create `tests/seller/replyToReview.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/data/user", () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    shop: { findUnique: vi.fn() },
    review: { findFirst: vi.fn() },
    reviewReply: { create: vi.fn() },
  },
}))

describe("replyToReview", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when not a verified seller", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "Thanks!")

    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns error for empty comment", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "SELLER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: "shop-1" } as any)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "   ")

    expect(result).toEqual({ error: "Reply cannot be empty" })
  })

  it("returns error when review not found in this shop", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "SELLER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: "shop-1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue(null)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "Thank you!")

    expect(result).toEqual({ error: "Review not found" })
  })

  it("returns error when already replied", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "SELLER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: "shop-1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue({ id: "rev-1", reply: { id: "reply-1" } } as any)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "Thank you!")

    expect(result).toEqual({ error: "Already replied to this review" })
  })

  it("creates reply on success", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", role: "SELLER" } as any)

    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: "shop-1" } as any)
    vi.mocked(prisma.review.findFirst).mockResolvedValue({ id: "rev-1", reply: null } as any)

    const { replyToReview } = await import("@/lib/seller/actions")
    const result = await replyToReview("rev-1", "Thank you for your feedback!")

    expect(result).toEqual({})
    expect(prisma.reviewReply.create).toHaveBeenCalledWith({
      data: { reviewId: "rev-1", shopId: "shop-1", comment: "Thank you for your feedback!" },
    })
  })
})
```

- [ ] **Step 2: Run tests to see them fail**

```
npx vitest run tests/seller/replyToReview.test.ts
```

Expected: FAIL — `replyToReview is not exported from '@/lib/seller/actions'`

- [ ] **Step 3: Add `getShopReviews` to `lib/seller/queries.ts`**

Add at the bottom of `lib/seller/queries.ts` (after the existing exports):

```ts
import type { ShopReviewWithProduct } from "@/types"

export async function getShopReviews(shopId: string): Promise<ShopReviewWithProduct[]> {
  return prisma.review.findMany({
    where: { product: { shopId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
      product: { select: { id: true, name: true, images: true } },
      reply: { select: { comment: true } },
    },
  })
}
```

- [ ] **Step 4: Add `replyToReview` to `lib/seller/actions.ts`**

Add at the bottom of `lib/seller/actions.ts` (reuses `getVerifiedShop` already defined in the file):

```ts
export async function replyToReview(reviewId: string, comment: string): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop) return { error: "Unauthorized" }

  const trimmed = comment.trim()
  if (!trimmed) return { error: "Reply cannot be empty" }

  const review = await prisma.review.findFirst({
    where: { id: reviewId, product: { shopId: shop.id } },
    select: { id: true, reply: { select: { id: true } } },
  })
  if (!review) return { error: "Review not found" }
  if (review.reply) return { error: "Already replied to this review" }

  await prisma.reviewReply.create({
    data: { reviewId, shopId: shop.id, comment: trimmed },
  })

  revalidatePath("/seller/reviews")
  return {}
}
```

- [ ] **Step 5: Run tests to verify they pass**

```
npx vitest run tests/seller/replyToReview.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 6: Create `components/seller/ReplyForm.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { replyToReview } from "@/lib/seller/actions"

interface ReplyFormProps {
  reviewId: string
}

export function ReplyForm({ reviewId }: ReplyFormProps) {
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!comment.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await replyToReview(reviewId, comment)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write your reply…"
        rows={3}
        className="w-full border border-border-default rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!comment.trim() || isPending}
        className="text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-4 py-1.5 rounded transition-colors"
      >
        {isPending ? "Submitting…" : "Reply"}
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Create `components/seller/ReviewsList.tsx`**

```tsx
import Image from "next/image"
import { ReplyForm } from "./ReplyForm"
import type { ShopReviewWithProduct } from "@/types"

interface ReviewsListProps {
  reviews: ShopReviewWithProduct[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return <p className="text-sm text-text-secondary">No reviews yet.</p>
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const image = review.product.images[0]
        return (
          <div key={review.id} className="bg-white border border-border-default rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border-default">
              {image && (
                <div className="relative w-10 h-10 flex-shrink-0">
                  <Image src={image} alt={review.product.name} fill className="object-cover rounded" />
                </div>
              )}
              <p className="text-sm font-medium text-text-primary line-clamp-1">
                {review.product.name}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  {review.user.name.split(" ")[0]}
                </span>
                <span className="text-xs text-text-secondary">
                  {new Date(review.createdAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={s <= review.rating ? "text-reward" : "text-gray-300"}>
                    ★
                  </span>
                ))}
              </div>
              {review.comment && (
                <p className="text-sm text-text-primary mt-1">{review.comment}</p>
              )}
            </div>

            {review.reply ? (
              <div className="mt-3 ml-2 pl-3 border-l-2 border-border-default bg-bg-page rounded-r px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-text-secondary">Shop's response</span>
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-medium">
                    Replied
                  </span>
                </div>
                <p className="text-sm text-text-primary">{review.reply.comment}</p>
              </div>
            ) : (
              <ReplyForm reviewId={review.id} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 8: Create `app/(seller)/seller/(portal)/reviews/page.tsx`**

```tsx
import { redirect } from "next/navigation"
import { getCurrentShop, getShopReviews } from "@/lib/seller/queries"
import { ReviewsList } from "@/components/seller/ReviewsList"

export const metadata = { title: "Product Reviews | Seller Centre" }

export default async function SellerReviewsPage() {
  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const reviews = await getShopReviews(shop.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Product Reviews</h1>
      <ReviewsList reviews={reviews} />
    </div>
  )
}
```

- [ ] **Step 9: Add Reviews to `components/seller/SellerSidebar.tsx`**

In `SellerSidebar.tsx`, update the `NAV` array to add Reviews after Orders:

```tsx
const NAV = [
  { label: "Dashboard", href: "/seller/dashboard" },
  { label: "All Products", href: "/seller/products" },
  { label: "Add Product", href: "/seller/products/new" },
  { label: "Orders", href: "/seller/orders" },
  { label: "Reviews", href: "/seller/reviews" },
  { label: "Shop Settings", href: "/seller/settings" },
]
```

- [ ] **Step 10: Run all tests**

```
npx vitest run
```

Expected: All tests pass (13 tests across 3 test files).

- [ ] **Step 11: Manual verification**

Go to `/seller/reviews`. Confirm:
- "Product Reviews" heading shown.
- Each review card shows product thumbnail + name, buyer first name, stars, comment, date.
- Reviews without a reply show the textarea + "Reply" button.
- Submitting a reply hides the form and shows the reply text with the green "Replied" badge.
- Reviews with an existing reply only show the reply block (no form rendered).
- "Reviews" nav item in the sidebar highlights when on that page.

- [ ] **Step 12: Commit**

```
git add lib/seller/queries.ts lib/seller/actions.ts components/seller/ReplyForm.tsx components/seller/ReviewsList.tsx "app/(seller)/seller/(portal)/reviews/page.tsx" components/seller/SellerSidebar.tsx tests/seller/replyToReview.test.ts
git commit -m "feat(reviews): add seller reviews page with reply functionality"
```
