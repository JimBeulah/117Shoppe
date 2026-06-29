# Shop Storefront Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/shop/[slug]` storefront page showing the shop's header (banner, logo, stats, Follow button) and a filterable/sortable product grid.

**Architecture:** Fully server-rendered page inside the existing `(shop)` layout group, using the same `searchParams` + `CatalogFilters` pattern as `/search` and `/category`. A single Client Component (`FollowButton`) handles the follow/unfollow toggle via a co-located server action.

**Tech Stack:** Next.js App Router, Prisma, Clerk (`auth()`), Tailwind CSS, `next/image`, `next/navigation`

## Global Constraints

- All new files use TypeScript strict mode (no `any`)
- Tailwind classes only — no inline styles
- Follow existing token names: `bg-bg-page`, `text-text-primary`, `text-text-secondary`, `border-border`, `text-brand-600`, `bg-brand-50`, `brand-100`, `brand-600`
- Server Components are async by default; Client Components need `"use client"` at the top
- Server actions need `"use server"` at the top
- `revalidate = 60` on read-only pages (same as product and category pages)
- No new dependencies

---

### Task 1: Add `ShopDetail` type and data functions

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/data/catalog.ts`

**Interfaces:**
- Produces:
  - `ShopDetail` type (used by Task 4 and Task 5)
  - `getShopBySlug(slug: string): Promise<ShopDetail | null>`
  - `getShopProducts(shopId: string, filters: CatalogFilters): Promise<{ products: ProductCard[]; total: number; pageSize: number }>`

- [ ] **Step 1: Add `ShopDetail` to `types/index.ts`**

Append to the bottom of `types/index.ts`:

```ts
export interface ShopDetail {
  id: string
  name: string
  slug: string
  logo: string | null
  banner: string | null
  rating: number
  followersCount: number
  createdAt: Date
  _count: {
    products: number
  }
}
```

- [ ] **Step 2: Add `getShopBySlug` to `lib/data/catalog.ts`**

Append after the last `export const` in `lib/data/catalog.ts`:

```ts
export const getShopBySlug = cache(async (slug: string): Promise<ShopDetail | null> => {
  const shop = await prisma.shop.findUnique({
    where: { slug, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      banner: true,
      rating: true,
      followersCount: true,
      createdAt: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  })
  return shop
})
```

Also update the existing types import line at the top of `lib/data/catalog.ts` to include `ShopDetail`. Find this line:

```ts
import type { CatalogFilters, CatalogResult, CategoryItem, ProductCard, ProductDetail } from "@/types"
```

And change it to:

```ts
import type { CatalogFilters, CatalogResult, CategoryItem, ProductCard, ProductDetail, ShopDetail } from "@/types"
```

- [ ] **Step 3: Add `getShopProducts` to `lib/data/catalog.ts`**

Append after `getShopBySlug`:

```ts
export const getShopProducts = cache(async (
  shopId: string,
  filters: CatalogFilters
): Promise<{ products: ProductCard[]; total: number; pageSize: number }> => {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    shopId,
    ...(filters.priceMin > 0 || filters.priceMax !== null
      ? {
          price: {
            ...(filters.priceMin > 0 ? { gte: filters.priceMin } : {}),
            ...(filters.priceMax !== null ? { lte: filters.priceMax } : {}),
          },
        }
      : {}),
    ...(filters.rating !== null ? { rating: { gte: filters.rating } } : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { shop: { select: { name: true, slug: true } } },
      orderBy: toOrderBy(filters.sort),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, pageSize: PAGE_SIZE }
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add types/index.ts lib/data/catalog.ts
git commit -m "feat(shop): add ShopDetail type and getShopBySlug/getShopProducts data functions"
```

---

### Task 2: Server action — `toggleFollow`

**Files:**
- Create: `app/(shop)/shop/[slug]/actions.ts`

**Interfaces:**
- Consumes: `getCurrentUser` from `@/lib/data/user`, `prisma` from `@/lib/db`
- Produces: `toggleFollow(shopId: string): Promise<{ following: boolean; followerCount: number }>`

- [ ] **Step 1: Create `app/(shop)/shop/[slug]/actions.ts`**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"

export async function toggleFollow(
  shopId: string,
  shopSlug: string
): Promise<{ following: boolean; followerCount: number }> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const existing = await prisma.shopFollow.findUnique({
    where: { userId_shopId: { userId: user.id, shopId } },
  })

  if (existing) {
    await prisma.shopFollow.delete({
      where: { userId_shopId: { userId: user.id, shopId } },
    })
    await prisma.shop.update({
      where: { id: shopId },
      data: { followersCount: { decrement: 1 } },
    })
  } else {
    await prisma.shopFollow.create({
      data: { userId: user.id, shopId },
    })
    await prisma.shop.update({
      where: { id: shopId },
      data: { followersCount: { increment: 1 } },
    })
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { followersCount: true },
  })

  revalidatePath(`/shop/${shopSlug}`)

  return {
    following: !existing,
    followerCount: shop?.followersCount ?? 0,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(shop)/shop/[slug]/actions.ts"
git commit -m "feat(shop): add toggleFollow server action"
```

---

### Task 3: `FollowButton` Client Component

**Files:**
- Create: `components/shop/FollowButton.tsx`

**Interfaces:**
- Consumes: `toggleFollow` from `@/app/(shop)/shop/[slug]/actions` (passed as prop to avoid import issues with dynamic slug)
- Produces: `<FollowButton shopId shopSlug initialFollowing initialCount />`

Props:
```ts
{
  shopId: string
  shopSlug: string
  initialFollowing: boolean
  initialCount: number
}
```

- [ ] **Step 1: Create `components/shop/FollowButton.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toggleFollow } from "@/app/(shop)/shop/[slug]/actions"

interface Props {
  shopId: string
  shopSlug: string
  initialFollowing: boolean
  initialCount: number
  isSignedIn: boolean
}

export function FollowButton({ shopId, shopSlug, initialFollowing, initialCount, isSignedIn }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!isSignedIn) {
      router.push("/sign-in")
      return
    }

    const nextFollowing = !following
    setFollowing(nextFollowing)
    setCount((c) => (nextFollowing ? c + 1 : c - 1))

    startTransition(async () => {
      try {
        const result = await toggleFollow(shopId, shopSlug)
        setFollowing(result.following)
        setCount(result.followerCount)
      } catch {
        // Revert optimistic update on error
        setFollowing(following)
        setCount(count)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary">{count.toLocaleString()} followers</span>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={
          following
            ? "px-4 py-1.5 rounded text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
            : "px-4 py-1.5 rounded text-sm font-medium border border-brand-600 text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-60"
        }
      >
        {isPending ? "..." : following ? "Following" : "Follow"}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/shop/FollowButton.tsx
git commit -m "feat(shop): add FollowButton client component"
```

---

### Task 4: `ShopHeader` Server Component

**Files:**
- Create: `components/shop/ShopHeader.tsx`

**Interfaces:**
- Consumes: `ShopDetail` from `@/types`, `FollowButton` from `./FollowButton`
- Produces: `<ShopHeader shop initialFollowing isSignedIn />`

Props:
```ts
{
  shop: ShopDetail
  initialFollowing: boolean
  isSignedIn: boolean
}
```

- [ ] **Step 1: Create `components/shop/ShopHeader.tsx`**

```tsx
import Image from "next/image"
import { FollowButton } from "./FollowButton"
import type { ShopDetail } from "@/types"

interface Props {
  shop: ShopDetail
  initialFollowing: boolean
  isSignedIn: boolean
}

export function ShopHeader({ shop, initialFollowing, isSignedIn }: Props) {
  const joinedDate = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(new Date(shop.createdAt))

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-white mb-6">
      {/* Banner */}
      <div className="relative h-40 bg-brand-600">
        {shop.banner && (
          <Image
            src={shop.banner}
            alt={`${shop.name} banner`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Logo + info row */}
      <div className="px-5 pb-4">
        <div className="flex items-end gap-4 -mt-9 mb-3">
          {/* Logo */}
          <div className="relative w-18 h-18 rounded-full overflow-hidden border-4 border-white bg-brand-100 flex-shrink-0 shadow-sm"
               style={{ width: 72, height: 72 }}>
            {shop.logo ? (
              <Image
                src={shop.logo}
                alt={shop.name}
                fill
                sizes="72px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-600 font-bold text-2xl">
                {shop.name[0]}
              </div>
            )}
          </div>

          {/* Name + stats */}
          <div className="flex-1 min-w-0 pt-10">
            <h1 className="text-lg font-bold text-text-primary truncate">{shop.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-text-secondary">
              <span>★ {shop.rating.toFixed(1)}</span>
              <span>{shop._count.products.toLocaleString()} products</span>
              <span>Joined {joinedDate}</span>
            </div>
          </div>

          {/* Follow button */}
          <div className="flex-shrink-0 pt-10">
            <FollowButton
              shopId={shop.id}
              shopSlug={shop.slug}
              initialFollowing={initialFollowing}
              initialCount={shop.followersCount}
              isSignedIn={isSignedIn}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/shop/ShopHeader.tsx
git commit -m "feat(shop): add ShopHeader server component"
```

---

### Task 5: Shop page + loading skeleton

**Files:**
- Create: `app/(shop)/shop/[slug]/page.tsx`
- Create: `app/(shop)/shop/[slug]/loading.tsx`

**Interfaces:**
- Consumes: `getShopBySlug`, `getShopProducts`, `parseCatalogFilters` from `@/lib/data/catalog`
- Consumes: `getCurrentUser` from `@/lib/data/user`
- Consumes: `prisma` from `@/lib/db`
- Consumes: `ShopHeader` from `@/components/shop/ShopHeader`
- Consumes: `SortBar`, `FilterSidebar`, `ProductGrid`, `Pagination` from `@/components/catalog/...`

- [ ] **Step 1: Create `app/(shop)/shop/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getShopBySlug, getShopProducts, parseCatalogFilters } from "@/lib/data/catalog"
import { getCurrentUser } from "@/lib/data/user"
import { prisma } from "@/lib/db"
import { ShopHeader } from "@/components/shop/ShopHeader"
import { SortBar } from "@/components/catalog/SortBar"
import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { Pagination } from "@/components/catalog/Pagination"

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const shop = await getShopBySlug(slug)
  if (!shop) return { title: "Shop Not Found | Eshopee" }
  return {
    title: `${shop.name} | Eshopee`,
    description: `Shop at ${shop.name} on Eshopee — ${shop._count.products} products available`,
    openGraph: {
      images: shop.logo ? [{ url: shop.logo }] : [],
    },
  }
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)

  const [shop, user] = await Promise.all([
    getShopBySlug(slug),
    getCurrentUser(),
  ])

  if (!shop) notFound()

  const [result, shopFollow] = await Promise.all([
    getShopProducts(shop.id, filters),
    user
      ? prisma.shopFollow.findUnique({
          where: { userId_shopId: { userId: user.id, shopId: shop.id } },
        })
      : Promise.resolve(null),
  ])

  const initialFollowing = shopFollow !== null

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <ShopHeader
          shop={shop}
          initialFollowing={initialFollowing}
          isSignedIn={user !== null}
        />

        <SortBar
          total={result.total}
          currentSort={filters.sort}
          filters={filters}
        />

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block">
            <FilterSidebar
              currentPriceMin={filters.priceMin}
              currentPriceMax={filters.priceMax}
              currentRating={filters.rating}
            />
          </div>
          <div>
            <ProductGrid products={result.products} />
            <Pagination
              total={result.total}
              pageSize={result.pageSize}
              currentPage={filters.page}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(shop)/shop/[slug]/loading.tsx`**

```tsx
export default function ShopLoading() {
  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header skeleton */}
        <div className="rounded-lg overflow-hidden border border-border bg-white mb-6">
          <div className="h-40 bg-border animate-pulse" />
          <div className="px-5 pb-4">
            <div className="flex items-end gap-4 -mt-9 mb-3">
              <div className="w-[72px] h-[72px] rounded-full bg-border animate-pulse border-4 border-white flex-shrink-0" />
              <div className="flex-1 pt-10 space-y-2">
                <div className="h-5 w-40 bg-border rounded animate-pulse" />
                <div className="h-3 w-56 bg-border rounded animate-pulse" />
              </div>
              <div className="pt-10">
                <div className="h-8 w-24 bg-border rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Sort bar skeleton */}
        <div className="h-10 w-full bg-border rounded animate-pulse mb-4" />

        {/* Grid skeleton */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-full bg-border rounded animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-border rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start dev server and verify manually**

```bash
npm run dev
```

Navigate to a product page (e.g. `/product/[any-slug]`). Click **Visit Shop** in the shop panel — it should load `/shop/[slug]` with:
- Banner strip (solid brand color if no banner image)
- Shop logo / initial, name, rating, product count, joined date
- Follow / Following button (try clicking — should toggle if signed in, redirect to `/sign-in` if not)
- Product grid with working sort and filter

Navigate to a non-existent slug (e.g. `/shop/does-not-exist`) — expect the 404 page.

- [ ] **Step 5: Commit**

```bash
git add "app/(shop)/shop/[slug]/page.tsx" "app/(shop)/shop/[slug]/loading.tsx"
git commit -m "feat(shop): add /shop/[slug] storefront page and loading skeleton"
```
