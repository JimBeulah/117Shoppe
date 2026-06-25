# Phase 2: Product Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build category listing pages with URL-driven filters/sorting and a product detail page with variant picker.

**Architecture:** All data fetching in async Server Components via Prisma. Filter/sort state lives in URL `searchParams` — no client state for filters except the price range inputs. Client Components handle interactive UI (variant picker, filter inputs, mobile drawer, image gallery).

**Tech Stack:** Next.js 16 (App Router, async params/searchParams), React 19, Prisma 7, Tailwind CSS 4, TypeScript, Vitest, lucide-react.

## Global Constraints

- `params` and `searchParams` are **Promises** in Next.js 16 — always `await` them.
- Prisma client imported from `@/lib/db` (singleton pattern already in place).
- Generated Prisma types at `@/lib/generated/prisma/client`.
- All prices in PHP — use `formatPrice` from `@/lib/utils`.
- Brand tokens: `brand-600` (primary), `brand-100`/`brand-50` (backgrounds), `accent-sale` (prices), `text-primary`, `text-secondary`, `border`.
- `export const revalidate = 60` on all new pages.
- **AGENTS.md requirement:** Read `node_modules/next/dist/docs/` for any API you're unsure about before writing code.
- No new dependencies — use only what's already installed.
- No toast library installed — use inline state feedback for user messages.

---

## File Map

**Create:**
- `types/index.ts` — add `CatalogFilters`, `CatalogCategory`, `CatalogResult`, `ProductVariantItem`, `ProductDetail`
- `lib/data/catalog.ts` — `parseCatalogFilters`, `getCategoryWithProducts`, `getProductBySlug`
- `components/catalog/Breadcrumb.tsx` — Server Component, crumb trail
- `components/catalog/ProductGrid.tsx` — Server Component, grid of ProductCards
- `components/catalog/Pagination.tsx` — Client Component, page nav
- `components/catalog/SortBar.tsx` — Client Component, sort dropdown + mobile filter trigger + FilterDrawer
- `components/catalog/FilterSidebar.tsx` — Client Component, price inputs + rating buttons
- `components/catalog/FilterDrawer.tsx` — Client Component, mobile slide-over
- `app/(shop)/category/[parent]/page.tsx` — top-level category page
- `app/(shop)/category/[parent]/loading.tsx` — skeleton
- `app/(shop)/category/[parent]/[child]/page.tsx` — subcategory page
- `app/(shop)/category/[parent]/[child]/loading.tsx` — skeleton
- `components/product/ImageGallery.tsx` — Client Component
- `components/product/VariantPicker.tsx` — Client Component (chips)
- `components/product/AddToCartButton.tsx` — Client Component (disabled, shows inline message)
- `components/product/ProductInteractivePanel.tsx` — Client Component (orchestrates price/stock/variant/cart)
- `components/product/ShopPanel.tsx` — Server Component (receives shop data as props)
- `app/(shop)/product/[slug]/page.tsx` — product detail page
- `app/(shop)/product/[slug]/loading.tsx` — skeleton
- `__tests__/catalog.test.ts` — unit tests for `parseCatalogFilters`

**Modify:**
- `types/index.ts` — append new type exports (existing types stay untouched)

---

## Task 1: Types

**Files:**
- Modify: `types/index.ts`
- Test: `__tests__/catalog.test.ts` (partial — types only, test written in Task 2)

**Interfaces:**
- Produces:
  - `CatalogFilters` — parsed filter state
  - `CatalogCategory` — category with parent/children for breadcrumb
  - `CatalogResult` — return type of `getCategoryWithProducts`
  - `ProductVariantItem` — single variant for VariantPicker
  - `ProductDetail` — full product for detail page

- [ ] **Step 1: Append new types to `types/index.ts`**

Open `types/index.ts` and append after the existing `VoucherItem` interface:

```ts
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
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add types/index.ts
git commit -m "feat(catalog): add Phase 2 catalog types"
```

---

## Task 2: Data Layer

**Files:**
- Create: `lib/data/catalog.ts`
- Create: `__tests__/catalog.test.ts`

**Interfaces:**
- Consumes: `CatalogFilters`, `CatalogResult`, `ProductDetail` from `@/types`; `prisma` from `@/lib/db`
- Produces:
  - `parseCatalogFilters(searchParams: Record<string, string | string[] | undefined>): CatalogFilters`
  - `getCategoryWithProducts(slug: string, level: 'parent' | 'child', filters: CatalogFilters): Promise<CatalogResult | null>`
  - `getProductBySlug(slug: string): Promise<ProductDetail | null>`

- [ ] **Step 1: Write the failing tests for `parseCatalogFilters`**

Create `__tests__/catalog.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { parseCatalogFilters } from "@/lib/data/catalog"

describe("parseCatalogFilters", () => {
  it("returns defaults when searchParams is empty", () => {
    const result = parseCatalogFilters({})
    expect(result).toEqual({
      sort: "best_seller",
      priceMin: 0,
      priceMax: null,
      rating: null,
      page: 1,
    })
  })

  it("parses valid sort values", () => {
    expect(parseCatalogFilters({ sort: "price_asc" }).sort).toBe("price_asc")
    expect(parseCatalogFilters({ sort: "price_desc" }).sort).toBe("price_desc")
    expect(parseCatalogFilters({ sort: "newest" }).sort).toBe("newest")
  })

  it("falls back to best_seller for unknown sort", () => {
    expect(parseCatalogFilters({ sort: "invalid" }).sort).toBe("best_seller")
  })

  it("parses price range", () => {
    const result = parseCatalogFilters({ price_min: "100", price_max: "5000" })
    expect(result.priceMin).toBe(100)
    expect(result.priceMax).toBe(5000)
  })

  it("omits priceMax when not provided", () => {
    expect(parseCatalogFilters({ price_min: "100" }).priceMax).toBeNull()
  })

  it("clamps priceMin to 0 for negative values", () => {
    expect(parseCatalogFilters({ price_min: "-50" }).priceMin).toBe(0)
  })

  it("parses rating 3 and 4", () => {
    expect(parseCatalogFilters({ rating: "4" }).rating).toBe(4)
    expect(parseCatalogFilters({ rating: "3" }).rating).toBe(3)
  })

  it("returns null rating for unknown rating values", () => {
    expect(parseCatalogFilters({ rating: "5" }).rating).toBeNull()
    expect(parseCatalogFilters({ rating: "2" }).rating).toBeNull()
  })

  it("parses page number", () => {
    expect(parseCatalogFilters({ page: "3" }).page).toBe(3)
  })

  it("clamps page to minimum 1", () => {
    expect(parseCatalogFilters({ page: "0" }).page).toBe(1)
    expect(parseCatalogFilters({ page: "-1" }).page).toBe(1)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```
npx vitest run __tests__/catalog.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/data/catalog'"

- [ ] **Step 3: Create `lib/data/catalog.ts`**

```ts
import { prisma } from "@/lib/db"
import type { CatalogFilters, CatalogResult, ProductDetail } from "@/types"

const PAGE_SIZE = 20

export function parseCatalogFilters(
  searchParams: Record<string, string | string[] | undefined>
): CatalogFilters {
  const get = (key: string): string | undefined => {
    const v = searchParams[key]
    return typeof v === "string" ? v : undefined
  }

  const sortRaw = get("sort")
  const sort: CatalogFilters["sort"] =
    sortRaw === "price_asc" || sortRaw === "price_desc" || sortRaw === "newest"
      ? sortRaw
      : "best_seller"

  const priceMin = Math.max(0, Number(get("price_min") ?? 0))
  const priceMaxRaw = get("price_max")
  const priceMax = priceMaxRaw !== undefined ? Number(priceMaxRaw) : null

  const ratingRaw = get("rating")
  const rating = ratingRaw === "4" ? 4 : ratingRaw === "3" ? 3 : null

  const page = Math.max(1, Number(get("page") ?? 1))

  return { sort, priceMin, priceMax, rating, page }
}

function toOrderBy(sort: CatalogFilters["sort"]) {
  switch (sort) {
    case "price_asc":  return { price: "asc" as const }
    case "price_desc": return { price: "desc" as const }
    case "newest":     return { createdAt: "desc" as const }
    default:           return { sold: "desc" as const }
  }
}

export async function getCategoryWithProducts(
  slug: string,
  level: "parent" | "child",
  filters: CatalogFilters
): Promise<CatalogResult | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!category) return null

  const categoryIds =
    level === "parent"
      ? [category.id, ...category.children.map((c) => c.id)]
      : [category.id]

  const where = {
    isActive: true,
    categoryId: { in: categoryIds },
    price: {
      gte: filters.priceMin,
      ...(filters.priceMax !== null ? { lte: filters.priceMax } : {}),
    },
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

  return {
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      parent: category.parent,
      children: category.children,
    },
    products,
    total,
    pageSize: PAGE_SIZE,
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: true,
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          rating: true,
          followersCount: true,
        },
      },
      category: {
        include: {
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
  })

  if (!product) return null

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice,
    flashSalePrice: product.flashSalePrice,
    isFlashSale: product.isFlashSale,
    stock: product.stock,
    sold: product.sold,
    images: product.images,
    rating: product.rating,
    reviewCount: product.reviewCount,
    variants: product.variants,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
      parent: product.category.parent,
    },
    shop: product.shop,
    _count: product._count,
  }
}
```

- [ ] **Step 4: Run tests**

```
npx vitest run __tests__/catalog.test.ts
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add lib/data/catalog.ts __tests__/catalog.test.ts
git commit -m "feat(catalog): add catalog data layer and parseCatalogFilters tests"
```

---

## Task 3: Catalog Shared Components (Breadcrumb, ProductGrid, Pagination)

**Files:**
- Create: `components/catalog/Breadcrumb.tsx`
- Create: `components/catalog/ProductGrid.tsx`
- Create: `components/catalog/Pagination.tsx`

**Interfaces:**
- Consumes: `ProductCard` type from `@/types`; existing `ProductCard` component from `@/components/ui/ProductCard`
- Produces:
  - `<Breadcrumb crumbs={Crumb[]} />` where `Crumb = { label: string; href?: string }`
  - `<ProductGrid products={ProductCard[]} />`
  - `<Pagination total={number} pageSize={number} currentPage={number} />`

- [ ] **Step 1: Create `components/catalog/Breadcrumb.tsx`**

```tsx
import Link from "next/link"

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-secondary py-2">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-brand-600 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-text-primary font-medium" aria-current="page">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create `components/catalog/ProductGrid.tsx`**

```tsx
import { ProductCard } from "@/components/ui/ProductCard"
import type { ProductCard as ProductCardType } from "@/types"

export function ProductGrid({ products }: { products: ProductCardType[] }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
        <span className="text-4xl mb-3" aria-hidden="true">🛍️</span>
        <p className="text-sm">No products found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/catalog/Pagination.tsx`**

```tsx
"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface PaginationProps {
  total: number
  pageSize: number
  currentPage: number
}

export function Pagination({ total, pageSize, currentPage }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / pageSize)

  if (totalPages <= 1) return null

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-center gap-1 py-6" role="navigation" aria-label="Pagination">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 rounded text-sm border border-border disabled:opacity-40 hover:border-brand-400 transition-colors"
      >
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => goToPage(p)}
          aria-current={p === currentPage ? "page" : undefined}
          className={`px-3 py-1.5 rounded text-sm border transition-colors ${
            p === currentPage
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border hover:border-brand-400"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded text-sm border border-border disabled:opacity-40 hover:border-brand-400 transition-colors"
      >
        Next
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add components/catalog/Breadcrumb.tsx components/catalog/ProductGrid.tsx components/catalog/Pagination.tsx
git commit -m "feat(catalog): add Breadcrumb, ProductGrid, Pagination components"
```

---

## Task 4: Filter & Sort Components (FilterSidebar, FilterDrawer, SortBar)

**Files:**
- Create: `components/catalog/FilterSidebar.tsx`
- Create: `components/catalog/FilterDrawer.tsx`
- Create: `components/catalog/SortBar.tsx`

**Interfaces:**
- Consumes: `CatalogFilters` from `@/types`; `useRouter`, `useSearchParams`, `usePathname` from next/navigation
- Produces:
  - `<FilterSidebar currentPriceMin={number} currentPriceMax={number|null} currentRating={number|null} />`
  - `<FilterDrawer open={boolean} onClose={() => void} filters={CatalogFilters} />`
  - `<SortBar total={number} currentSort={string} filters={CatalogFilters} />` (SortBar renders FilterDrawer internally — manages `drawerOpen` state itself)

- [ ] **Step 1: Create `components/catalog/FilterSidebar.tsx`**

```tsx
"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState } from "react"

const RATING_OPTIONS = [
  { value: "4", label: "4★ & Up" },
  { value: "3", label: "3★ & Up" },
]

interface FilterSidebarProps {
  currentPriceMin: number
  currentPriceMax: number | null
  currentRating: number | null
}

export function FilterSidebar({ currentPriceMin, currentPriceMax, currentRating }: FilterSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [minInput, setMinInput] = useState(currentPriceMin > 0 ? String(currentPriceMin) : "")
  const [maxInput, setMaxInput] = useState(currentPriceMax !== null ? String(currentPriceMax) : "")

  function applyFilters(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  function handlePriceCommit() {
    applyFilters({
      price_min: minInput || null,
      price_max: maxInput || null,
    })
  }

  function handleRating(value: string) {
    const current = currentRating !== null ? String(currentRating) : ""
    applyFilters({ rating: current === value ? null : value })
  }

  function clearAll() {
    setMinInput("")
    setMaxInput("")
    router.replace(pathname)
  }

  return (
    <aside className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-text-primary">Filters</h3>
        <button onClick={clearAll} className="text-xs text-brand-600 hover:underline">
          Clear all
        </button>
      </div>

      <div>
        <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
          Price Range (₱)
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={handlePriceCommit}
            onKeyDown={(e) => e.key === "Enter" && handlePriceCommit()}
            className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400"
            aria-label="Minimum price"
          />
          <span className="text-text-secondary text-sm" aria-hidden="true">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={handlePriceCommit}
            onKeyDown={(e) => e.key === "Enter" && handlePriceCommit()}
            className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400"
            aria-label="Maximum price"
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Rating</h4>
        <div className="space-y-1.5" role="radiogroup" aria-label="Filter by rating">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRating(opt.value)}
              role="radio"
              aria-checked={String(currentRating) === opt.value}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                String(currentRating) === opt.value
                  ? "bg-brand-100 text-brand-700 font-medium"
                  : "hover:bg-brand-50 text-text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create `components/catalog/FilterDrawer.tsx`**

```tsx
"use client"

import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import type { CatalogFilters } from "@/types"

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: CatalogFilters
}

export function FilterDrawer({ open, onClose, filters }: FilterDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-0 h-full w-80 bg-white p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Filters</h2>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="text-text-secondary hover:text-text-primary text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <FilterSidebar
          currentPriceMin={filters.priceMin}
          currentPriceMax={filters.priceMax}
          currentRating={filters.rating}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/catalog/SortBar.tsx`**

SortBar manages its own `drawerOpen` state and renders FilterDrawer internally — the Server page doesn't need to know about the mobile drawer.

```tsx
"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { FilterDrawer } from "@/components/catalog/FilterDrawer"
import type { CatalogFilters } from "@/types"

const SORT_OPTIONS = [
  { value: "best_seller", label: "Best Seller" },
  { value: "newest",      label: "Newest" },
  { value: "price_asc",   label: "Price: Low to High" },
  { value: "price_desc",  label: "Price: High to Low" },
] as const

interface SortBarProps {
  total: number
  currentSort: string
  filters: CatalogFilters
}

export function SortBar({ total, currentSort, filters }: SortBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  function handleSort(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", value)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} filters={filters} />
      <div className="flex items-center justify-between py-3 border-b border-border">
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">{total.toLocaleString()}</span> results
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center gap-1.5 text-sm border border-border rounded px-3 py-1.5 hover:border-brand-400 transition-colors"
            aria-label="Open filters"
          >
            ⚙️ Filters
          </button>
          <select
            value={currentSort}
            onChange={(e) => handleSort(e.target.value)}
            className="text-sm border border-border rounded px-3 py-1.5 bg-white focus:outline-none focus:border-brand-400"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add components/catalog/FilterSidebar.tsx components/catalog/FilterDrawer.tsx components/catalog/SortBar.tsx
git commit -m "feat(catalog): add FilterSidebar, FilterDrawer, SortBar components"
```

---

## Task 5: Category Pages

**Files:**
- Create: `app/(shop)/category/[parent]/page.tsx`
- Create: `app/(shop)/category/[parent]/loading.tsx`
- Create: `app/(shop)/category/[parent]/[child]/page.tsx`
- Create: `app/(shop)/category/[parent]/[child]/loading.tsx`

**Interfaces:**
- Consumes: `getCategoryWithProducts`, `parseCatalogFilters` from `@/lib/data/catalog`; all catalog components; `notFound` from next/navigation; `Metadata` from next

- [ ] **Step 1: Create `app/(shop)/category/[parent]/loading.tsx`**

```tsx
export default function CategoryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 animate-pulse">
      <div className="h-4 w-48 bg-brand-100 rounded mb-3" />
      <div className="h-7 w-40 bg-brand-100 rounded mb-4" />
      <div className="h-10 bg-brand-50 rounded mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <div className="hidden lg:block space-y-3">
          <div className="h-4 w-20 bg-brand-100 rounded" />
          <div className="h-8 bg-brand-50 rounded" />
          <div className="h-8 bg-brand-50 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-brand-50 rounded-lg aspect-square" />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(shop)/category/[parent]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCategoryWithProducts, parseCatalogFilters } from "@/lib/data/catalog"
import { Breadcrumb } from "@/components/catalog/Breadcrumb"
import { SortBar } from "@/components/catalog/SortBar"
import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { Pagination } from "@/components/catalog/Pagination"

export const revalidate = 60

interface Props {
  params: Promise<{ parent: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { parent } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)
  const result = await getCategoryWithProducts(parent, "parent", filters)
  if (!result) return { title: "Category Not Found | Eshopee" }
  return {
    title: `${result.category.name} | Eshopee`,
    description: `Shop ${result.category.name} — ${result.total.toLocaleString()} products on Eshopee`,
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { parent } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)
  const result = await getCategoryWithProducts(parent, "parent", filters)

  if (!result) notFound()

  const crumbs = [
    { label: "Home", href: "/" },
    { label: result.category.name },
  ]

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumb crumbs={crumbs} />
        <h1 className="text-xl font-bold text-text-primary mb-3">{result.category.name}</h1>
        <SortBar total={result.total} currentSort={filters.sort} filters={filters} />
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

- [ ] **Step 3: Verify top-level category page manually**

```
npm run dev
```

Navigate to `http://localhost:3000/category/<any-seeded-category-slug>`.

Expected:
- Page renders with category name as `<h1>`
- Products grid shows seeded products for that category
- Sort dropdown changes product order
- Price filter inputs appear in the sidebar
- Navigation to page 2 (if > 20 products) works

- [ ] **Step 4: Create `app/(shop)/category/[parent]/[child]/loading.tsx`**

```tsx
export default function SubcategoryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 animate-pulse">
      <div className="h-4 w-64 bg-brand-100 rounded mb-3" />
      <div className="h-7 w-40 bg-brand-100 rounded mb-4" />
      <div className="h-10 bg-brand-50 rounded mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <div className="hidden lg:block space-y-3">
          <div className="h-4 w-20 bg-brand-100 rounded" />
          <div className="h-8 bg-brand-50 rounded" />
          <div className="h-8 bg-brand-50 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-brand-50 rounded-lg aspect-square" />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/(shop)/category/[parent]/[child]/page.tsx`**

The subcategory page uses `level: "child"` and builds a three-segment breadcrumb using `category.parent`.

```tsx
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCategoryWithProducts, parseCatalogFilters } from "@/lib/data/catalog"
import { Breadcrumb } from "@/components/catalog/Breadcrumb"
import { SortBar } from "@/components/catalog/SortBar"
import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { Pagination } from "@/components/catalog/Pagination"

export const revalidate = 60

interface Props {
  params: Promise<{ parent: string; child: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { child } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)
  const result = await getCategoryWithProducts(child, "child", filters)
  if (!result) return { title: "Category Not Found | Eshopee" }
  return {
    title: `${result.category.name} | Eshopee`,
    description: `Shop ${result.category.name} — ${result.total.toLocaleString()} products on Eshopee`,
  }
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { parent, child } = await params
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)
  const result = await getCategoryWithProducts(child, "child", filters)

  if (!result) notFound()

  const crumbs = [
    { label: "Home", href: "/" },
    ...(result.category.parent
      ? [{ label: result.category.parent.name, href: `/category/${parent}` }]
      : []),
    { label: result.category.name },
  ]

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Breadcrumb crumbs={crumbs} />
        <h1 className="text-xl font-bold text-text-primary mb-3">{result.category.name}</h1>
        <SortBar total={result.total} currentSort={filters.sort} filters={filters} />
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

- [ ] **Step 6: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```
git add app/\(shop\)/category/
git commit -m "feat(catalog): add category and subcategory listing pages"
```

---

## Task 6: Product Detail Components

**Files:**
- Create: `components/product/ImageGallery.tsx`
- Create: `components/product/VariantPicker.tsx`
- Create: `components/product/AddToCartButton.tsx`
- Create: `components/product/ProductInteractivePanel.tsx`
- Create: `components/product/ShopPanel.tsx`

**Interfaces:**
- Consumes: `ProductVariantItem` from `@/types`; `formatPrice`, `calcDiscount` from `@/lib/utils`; `Badge` from `@/components/ui/Badge`
- Produces:
  - `<ImageGallery images={string[]} productName={string} />`
  - `<VariantPicker variants={ProductVariantItem[]} selectedId={string|null} onSelect={(id: string) => void} />`
  - `<AddToCartButton />`
  - `<ProductInteractivePanel basePrice={number} originalPrice={number|null} flashSalePrice={number|null} isFlashSale={boolean} baseStock={number} variants={ProductVariantItem[]} />`
  - `<ShopPanel shop={{ id, name, slug, logo, rating, followersCount }} />`

- [ ] **Step 1: Create `components/product/ImageGallery.tsx`**

```tsx
"use client"

import { useState } from "react"
import Image from "next/image"

interface ImageGalleryProps {
  images: string[]
  productName: string
}

const PLACEHOLDER = "https://placehold.co/600x600/EDE9FE/7C3AED?text=No+Image"

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const displayImages = images.length > 0 ? images : [PLACEHOLDER]
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-brand-50">
        <Image
          src={displayImages[activeIndex]}
          alt={productName}
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover"
          priority
        />
      </div>
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {displayImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                i === activeIndex ? "border-brand-600" : "border-border hover:border-brand-400"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/product/VariantPicker.tsx`**

```tsx
"use client"

import type { ProductVariantItem } from "@/types"

interface VariantPickerProps {
  variants: ProductVariantItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function VariantPicker({ variants, selectedId, onSelect }: VariantPickerProps) {
  if (variants.length === 0) return null

  return (
    <div>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
        Option
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Product options">
        {variants.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            disabled={v.stock === 0}
            aria-pressed={v.id === selectedId}
            className={`px-3 py-1.5 rounded border text-sm transition-colors ${
              v.id === selectedId
                ? "border-brand-600 bg-brand-50 text-brand-700 font-medium"
                : v.stock === 0
                ? "border-border text-text-secondary opacity-50 cursor-not-allowed line-through"
                : "border-border text-text-primary hover:border-brand-400"
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/product/AddToCartButton.tsx`**

```tsx
"use client"

import { useState } from "react"

export function AddToCartButton() {
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState("")

  function handleAddToCart() {
    setMessage("Sign in to add items to your cart.")
    setTimeout(() => setMessage(""), 3000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Quantity</p>
        <div className="flex items-center border border-border rounded">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-brand-50 transition-colors"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium" aria-live="polite">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="w-8 h-8 flex items-center justify-center text-text-primary hover:bg-brand-50 transition-colors"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <button
        onClick={handleAddToCart}
        className="w-full py-3 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
      >
        Add to Cart
      </button>
      {message && (
        <p className="text-xs text-text-secondary text-center" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `components/product/ProductInteractivePanel.tsx`**

This Client Component orchestrates variant selection and updates the displayed price and stock. It renders VariantPicker and AddToCartButton.

```tsx
"use client"

import { useState } from "react"
import { VariantPicker } from "@/components/product/VariantPicker"
import { AddToCartButton } from "@/components/product/AddToCartButton"
import { Badge } from "@/components/ui/Badge"
import { formatPrice, calcDiscount } from "@/lib/utils"
import type { ProductVariantItem } from "@/types"

interface ProductInteractivePanelProps {
  basePrice: number
  originalPrice: number | null
  flashSalePrice: number | null
  isFlashSale: boolean
  baseStock: number
  variants: ProductVariantItem[]
}

export function ProductInteractivePanel({
  basePrice,
  originalPrice,
  flashSalePrice,
  isFlashSale,
  baseStock,
  variants,
}: ProductInteractivePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? null

  const displayPrice = selectedVariant
    ? selectedVariant.price
    : isFlashSale && flashSalePrice !== null
    ? flashSalePrice
    : basePrice

  const comparePrice = selectedVariant ? null : (originalPrice ?? null)
  const discount = comparePrice ? calcDiscount(comparePrice, displayPrice) : 0
  const stock = selectedVariant ? selectedVariant.stock : baseStock

  return (
    <div className="space-y-4">
      {/* Price */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-accent-sale">{formatPrice(displayPrice)}</span>
        {comparePrice && discount >= 5 && (
          <>
            <span className="text-sm text-text-secondary line-through">{formatPrice(comparePrice)}</span>
            <Badge variant="sale" label={`-${discount}%`} />
          </>
        )}
        {isFlashSale && !selectedVariant && <Badge variant="hot" label="Flash Sale" />}
      </div>

      {/* Stock */}
      <p className="text-xs text-text-secondary">
        {stock > 0 ? (
          <>{stock.toLocaleString()} pieces available</>
        ) : (
          <span className="text-accent-sale font-medium">Out of Stock</span>
        )}
      </p>

      {/* Variants */}
      {variants.length > 0 && (
        <VariantPicker
          variants={variants}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}

      {/* Cart */}
      <AddToCartButton />
    </div>
  )
}
```

- [ ] **Step 5: Create `components/product/ShopPanel.tsx`**

```tsx
import Image from "next/image"
import Link from "next/link"

interface ShopPanelProps {
  shop: {
    id: string
    name: string
    slug: string
    logo: string | null
    rating: number
    followersCount: number
  }
}

export function ShopPanel({ shop }: ShopPanelProps) {
  return (
    <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-brand-100 flex-shrink-0">
        {shop.logo ? (
          <Image src={shop.logo} alt={shop.name} fill sizes="48px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-600 font-bold text-lg">
            {shop.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-text-primary truncate">{shop.name}</p>
        <p className="text-xs text-text-secondary">
          ★ {shop.rating.toFixed(1)} · {shop.followersCount.toLocaleString()} followers
        </p>
      </div>
      <Link
        href={`/shop/${shop.slug}`}
        className="flex-shrink-0 px-3 py-1.5 border border-brand-600 text-brand-600 rounded text-xs font-medium hover:bg-brand-50 transition-colors"
      >
        Visit Shop
      </Link>
    </div>
  )
}
```

- [ ] **Step 6: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```
git add components/product/
git commit -m "feat(catalog): add product detail components (gallery, variants, cart button, shop panel)"
```

---

## Task 7: Product Detail Page

**Files:**
- Create: `app/(shop)/product/[slug]/page.tsx`
- Create: `app/(shop)/product/[slug]/loading.tsx`

**Interfaces:**
- Consumes: `getProductBySlug` from `@/lib/data/catalog`; all product detail components; `formatSold` from `@/lib/utils`; `notFound`, `Metadata` from next

- [ ] **Step 1: Create `app/(shop)/product/[slug]/loading.tsx`**

```tsx
export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 animate-pulse">
      <div className="h-4 w-64 bg-brand-100 rounded mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div>
          <div className="aspect-square w-full bg-brand-50 rounded-lg mb-3" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-16 h-16 bg-brand-50 rounded" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-7 bg-brand-100 rounded w-3/4" />
          <div className="h-4 bg-brand-50 rounded w-1/2" />
          <div className="h-8 bg-brand-100 rounded w-1/3" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-16 bg-brand-50 rounded" />
            ))}
          </div>
          <div className="h-12 bg-brand-100 rounded" />
          <div className="h-20 bg-brand-50 rounded" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(shop)/product/[slug]/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify product detail page manually**

With dev server running, click any `ProductCard` from the homepage (they already link to `/product/[slug]`).

Expected:
- Page renders with product image gallery, name, rating line, price (with flash sale badge if applicable)
- Variant chips appear if product has variants; selecting one updates price and stock
- Quantity stepper increments/decrements
- Clicking "Add to Cart" shows the inline message "Sign in to add items to your cart."
- Shop panel shows shop name, rating, follower count, "Visit Shop" link
- Product description renders below
- Breadcrumb shows correct trail (Home → Category → Product, or Home → Parent → Child → Product)
- `<title>` in browser tab matches product name

- [ ] **Step 5: Run full test suite**

```
npx vitest run
```

Expected: all tests pass (at minimum the 11 `parseCatalogFilters` tests).

- [ ] **Step 6: Run lint**

```
npm run lint
```

Expected: no errors.

- [ ] **Step 7: Final commit**

```
git add app/\(shop\)/product/
git commit -m "feat(catalog): add product detail page with image gallery, variant picker, and shop panel"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `/category/[parent]` route | Task 5 |
| `/category/[parent]/[child]` route | Task 5 |
| `/product/[slug]` route | Task 7 |
| `searchParams` filters (sort, price, rating, page) | Tasks 2, 4 |
| FilterSidebar with price inputs + rating buttons | Task 4 |
| SortBar with mobile filter trigger | Task 4 |
| FilterDrawer (mobile) | Task 4 |
| ProductGrid reusing existing ProductCard | Task 3 |
| Pagination | Task 3 |
| Breadcrumb | Task 3 |
| ImageGallery with thumbnails | Task 6 |
| VariantPicker chips | Task 6 |
| AddToCartButton (disabled, inline message) | Task 6 |
| ShopPanel | Task 6 |
| `generateMetadata` on all pages | Tasks 5, 7 |
| `revalidate = 60` | Tasks 5, 7 |
| `loading.tsx` skeletons | Tasks 5, 7 |
| `notFound()` for missing slugs | Tasks 5, 7 |
| Unit tests for `parseCatalogFilters` | Task 2 |
