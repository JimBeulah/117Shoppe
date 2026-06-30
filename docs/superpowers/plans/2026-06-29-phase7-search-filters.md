# Phase 7: Search & Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text keyword search, a `/search` results page, a working Navbar search form, and a category filter panel that threads through the existing catalog UI.

**Architecture:** The data layer adds `q` (keyword) and `category` (slug) to `CatalogFilters`, a pure `buildSearchWhere()` function for testable query building, and `searchProducts()` / `getParentCategories()` async fetchers. The UI wires a `<form>` into the Navbar, adds an optional categories section to `FilterSidebar`, threads the optional props through `FilterDrawer` and `SortBar`, then creates the `/search` Server Component page that reuses all existing catalog components.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma, Tailwind CSS v4, Vitest.

## Global Constraints

- Production quality — no TODOs, no shortcuts
- Import path alias: `@/` maps to repo root
- Prisma client import: `@/lib/db` (named export `prisma`)
- TypeScript strict mode — no `any` except where casting third-party mocks in tests
- Tailwind design tokens: `text-text-primary`, `text-text-secondary`, `bg-bg-page`, `text-brand-600`, `border-border`, `bg-brand-50`, `bg-brand-100`, `text-brand-700` — use these, not raw colors
- Peso formatting: `₱` symbol, `toLocaleString('en-PH')`
- `revalidate = 0` on the search page (results are fully dynamic)
- `revalidate = 60` on category pages (already set, do not change)
- No `"use client"` on the search page or data layer — only components that need browser APIs

---

## File Map

| Action | File | What it does |
|--------|------|--------------|
| Modify | `types/index.ts` | Add `q: string` and `category: string \| null` to `CatalogFilters` |
| Modify | `lib/data/catalog.ts` | `parseCatalogFilters` parses `q`/`category`; add `buildSearchWhere`, `searchProducts`, `getParentCategories` |
| Create | `tests/lib/data/catalog.test.ts` | Unit tests for `parseCatalogFilters` extensions and `buildSearchWhere` |
| Modify | `components/layout/Navbar.tsx` | Wrap search in `<form>`, push `/search?q=...` on submit |
| Modify | `components/catalog/FilterSidebar.tsx` | Optional `categories` + `currentCategory` props for category section |
| Modify | `components/catalog/FilterDrawer.tsx` | Forward optional category props to `FilterSidebar` |
| Modify | `components/catalog/SortBar.tsx` | Accept + forward optional category props to `FilterDrawer` |
| Create | `app/(shop)/search/page.tsx` | Search results Server Component |
| Create | `app/(shop)/search/loading.tsx` | Skeleton loading state |

---

### Task 1: Extend `CatalogFilters` type and data layer

**Files:**
- Modify: `types/index.ts:46-52`
- Modify: `lib/data/catalog.ts`
- Create: `tests/lib/data/catalog.test.ts`

**Interfaces:**
- Produces: `CatalogFilters` with `q: string` and `category: string | null` consumed by all subsequent tasks
- Produces: `buildSearchWhere(filters: CatalogFilters): Prisma.ProductWhereInput` — pure, used in tests
- Produces: `searchProducts(filters: CatalogFilters): Promise<{ products: ProductCard[], total: number, pageSize: number }>` — used by Task 5
- Produces: `getParentCategories(): Promise<CategoryItem[]>` — used by Task 5

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/data/catalog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({ prisma: { product: { findMany: vi.fn(), count: vi.fn() }, category: { findMany: vi.fn() } } }))
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react")
  return { ...actual, cache: (fn: unknown) => fn }
})

describe("parseCatalogFilters", () => {
  beforeEach(() => vi.resetModules())

  it("extracts q from search params", async () => {
    const { parseCatalogFilters } = await import("@/lib/data/catalog")
    const filters = parseCatalogFilters({ q: "phone case" })
    expect(filters.q).toBe("phone case")
  })

  it("defaults q to empty string when absent", async () => {
    const { parseCatalogFilters } = await import("@/lib/data/catalog")
    const filters = parseCatalogFilters({})
    expect(filters.q).toBe("")
  })

  it("extracts category slug from search params", async () => {
    const { parseCatalogFilters } = await import("@/lib/data/catalog")
    const filters = parseCatalogFilters({ category: "electronics" })
    expect(filters.category).toBe("electronics")
  })

  it("defaults category to null when absent", async () => {
    const { parseCatalogFilters } = await import("@/lib/data/catalog")
    const filters = parseCatalogFilters({})
    expect(filters.category).toBeNull()
  })
})

describe("buildSearchWhere", () => {
  beforeEach(() => vi.resetModules())

  it("always includes isActive: true", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: null, page: 1, q: "", category: null })
    expect(where.isActive).toBe(true)
  })

  it("adds OR clause for name/description when q is set", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: null, page: 1, q: "earbuds", category: null })
    expect(where.OR).toEqual([
      { name: { contains: "earbuds", mode: "insensitive" } },
      { description: { contains: "earbuds", mode: "insensitive" } },
    ])
  })

  it("does NOT add OR clause when q is empty string", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: null, page: 1, q: "", category: null })
    expect(where.OR).toBeUndefined()
  })

  it("filters by category slug when category is set", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: null, page: 1, q: "", category: "electronics" })
    expect(where.category).toEqual({ slug: "electronics" })
  })

  it("adds price.gte when priceMin > 0", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 500, priceMax: null, rating: null, page: 1, q: "", category: null })
    expect((where.price as Record<string, unknown>)?.gte).toBe(500)
  })

  it("adds price.lte when priceMax is set", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: 2000, rating: null, page: 1, q: "", category: null })
    expect((where.price as Record<string, unknown>)?.lte).toBe(2000)
  })

  it("adds rating.gte when rating is set", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: 4, page: 1, q: "", category: null })
    expect((where.rating as Record<string, unknown>)?.gte).toBe(4)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/data/catalog.test.ts`

Expected: FAIL — `parseCatalogFilters` returns no `q`/`category`, `buildSearchWhere` is not exported.

- [ ] **Step 3: Update `CatalogFilters` type**

In `types/index.ts`, replace lines 46–52 (the `CatalogFilters` interface):

```typescript
export interface CatalogFilters {
  sort: 'best_seller' | 'price_asc' | 'price_desc' | 'newest'
  priceMin: number
  priceMax: number | null
  rating: number | null
  page: number
  q: string
  category: string | null
}
```

- [ ] **Step 4: Update `parseCatalogFilters` and add search functions**

Replace the full contents of `lib/data/catalog.ts`:

```typescript
import { cache } from "react"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import type { CatalogFilters, CatalogResult, CategoryItem, ProductCard, ProductDetail } from "@/types"

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

  const priceMinRaw = Number(get("price_min") ?? 0)
  const priceMin = Number.isFinite(priceMinRaw) ? Math.max(0, priceMinRaw) : 0
  const priceMaxRaw = Number(get("price_max") ?? "")
  const priceMax = Number.isFinite(priceMaxRaw) && get("price_max") !== undefined ? priceMaxRaw : null

  const ratingRaw = get("rating")
  const rating = ratingRaw === "4" ? 4 : ratingRaw === "3" ? 3 : null

  const page = Math.max(1, Number(get("page") ?? 1))
  const q = get("q") ?? ""
  const category = get("category") ?? null

  return { sort, priceMin, priceMax, rating, page, q, category }
}

function toOrderBy(sort: CatalogFilters["sort"]) {
  switch (sort) {
    case "price_asc":  return { price: "asc" as const }
    case "price_desc": return { price: "desc" as const }
    case "newest":     return { createdAt: "desc" as const }
    default:           return { sold: "desc" as const }
  }
}

export function buildSearchWhere(filters: CatalogFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true }

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ]
  }

  if (filters.category) {
    where.category = { slug: filters.category }
  }

  if (filters.priceMin > 0 || filters.priceMax !== null) {
    where.price = {
      ...(filters.priceMin > 0 ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax !== null ? { lte: filters.priceMax } : {}),
    }
  }

  if (filters.rating !== null) {
    where.rating = { gte: filters.rating }
  }

  return where
}

export const searchProducts = cache(async (
  filters: CatalogFilters
): Promise<{ products: ProductCard[]; total: number; pageSize: number }> => {
  const where = buildSearchWhere(filters)

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

export const getParentCategories = cache(async (): Promise<CategoryItem[]> => {
  return prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true, slug: true, icon: true },
    orderBy: { name: "asc" },
  })
})

export const getCategoryWithProducts = cache(async (
  slug: string,
  level: "parent" | "child",
  filters: CatalogFilters
): Promise<CatalogResult | null> => {
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
})

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
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
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/data/catalog.test.ts`

Expected: PASS (all 11 tests green).

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `npx vitest run`

Expected: PASS (all existing tests still pass).

- [ ] **Step 7: Commit**

```bash
git add types/index.ts lib/data/catalog.ts tests/lib/data/catalog.test.ts
git commit -m "feat(search): extend CatalogFilters with q/category, add searchProducts and getParentCategories"
```

---

### Task 2: Wire up Navbar search form

**Files:**
- Modify: `components/layout/Navbar.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 at runtime (just navigates to `/search?q=...`)
- Produces: functional search form that pushes `?q=<term>` to the search page

- [ ] **Step 1: Replace dead search input with a working form**

Replace the full contents of `components/layout/Navbar.tsx`:

```tsx
"use client"

import Link from "next/link"
import { Search, ShoppingCart, Bell } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs"

interface NavbarProps {
  cartBadge?: React.ReactNode
}

export function Navbar({ cartBadge }: NavbarProps) {
  const [search, setSearch] = useState("")
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    } else {
      router.push("/search")
    }
  }

  return (
    <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-white font-bold text-xl tracking-tight leading-none">
              11/7<br />
              <span className="text-brand-100 text-sm font-semibold">Eshopee</span>
            </span>
          </Link>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex-1 flex items-center bg-white rounded-sm overflow-hidden max-w-2xl"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, shops, brands..."
              className="flex-1 px-4 py-2 text-text-primary text-sm outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 transition-colors"
            >
              <Search size={18} />
            </button>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link href="/cart" aria-label="Shopping cart" className="relative hover:text-brand-100 transition-colors">
              <ShoppingCart size={22} />
              <span className="absolute -top-1.5 -right-1.5 bg-accent-sale text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartBadge ?? "0"}
              </span>
            </Link>
            <button aria-label="Notifications" className="hover:text-brand-100 transition-colors">
              <Bell size={22} />
            </button>
            <div className="h-5 w-px bg-white/30" />

            <Show
              when="signed-out"
              fallback={
                <UserButton
                  userProfileUrl="/account/profile"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                    },
                  }}
                />
              }
            >
              <SignInButton mode="redirect">
                <button className="text-sm hover:text-brand-100 transition-colors font-medium">
                  Login
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button className="text-sm border border-white/60 px-3 py-1 rounded hover:bg-white/10 transition-colors font-medium">
                  Register
                </button>
              </SignUpButton>
            </Show>
          </div>
        </div>

        {/* Sub-nav */}
        <nav className="flex items-center gap-5 mt-2 text-xs text-white/80">
          {["Download the App", "Sell on Eshopee", "Help Center", "Flash Deals"].map((item) => (
            <Link key={item} href="#" className="hover:text-white transition-colors">
              {item}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Manual verification**

Start dev server (`npm run dev`), type "phone" in the search bar, press Enter or click the search icon. Verify the URL becomes `/search?q=phone`. Clicking the search icon with empty input should navigate to `/search`.

- [ ] **Step 3: Commit**

```bash
git add components/layout/Navbar.tsx
git commit -m "feat(search): wire up Navbar search form to /search page"
```

---

### Task 3: Add category filter section to `FilterSidebar` and thread through `FilterDrawer` / `SortBar`

**Files:**
- Modify: `components/catalog/FilterSidebar.tsx`
- Modify: `components/catalog/FilterDrawer.tsx`
- Modify: `components/catalog/SortBar.tsx`

**Interfaces:**
- Consumes: `CategoryItem` from `@/types`
- Produces: `FilterSidebarProps` extended with `categories?: CategoryItem[]` and `currentCategory?: string | null`

- [ ] **Step 1: Update `FilterSidebar`**

Replace the full contents of `components/catalog/FilterSidebar.tsx`:

```tsx
"use client"

import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState } from "react"
import type { CategoryItem } from "@/types"

const RATING_OPTIONS = [
  { value: "4", label: "4★ & Up" },
  { value: "3", label: "3★ & Up" },
]

interface FilterSidebarProps {
  currentPriceMin: number
  currentPriceMax: number | null
  currentRating: number | null
  categories?: CategoryItem[]
  currentCategory?: string | null
}

export function FilterSidebar({
  currentPriceMin,
  currentPriceMax,
  currentRating,
  categories,
  currentCategory,
}: FilterSidebarProps) {
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

      {/* Category filter — only rendered when categories are provided (search page) */}
      {categories && categories.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
            Category
          </h4>
          <div className="space-y-1">
            {/* "All" option */}
            <Link
              href={(() => {
                const params = new URLSearchParams(searchParams.toString())
                params.delete("category")
                params.delete("page")
                return `${pathname}?${params.toString()}`
              })()}
              className={`block w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                !currentCategory
                  ? "bg-brand-100 text-brand-700 font-medium"
                  : "hover:bg-brand-50 text-text-primary"
              }`}
            >
              All Categories
            </Link>
            {categories.map((cat) => {
              const params = new URLSearchParams(searchParams.toString())
              params.set("category", cat.slug)
              params.delete("page")
              return (
                <Link
                  key={cat.id}
                  href={`${pathname}?${params.toString()}`}
                  className={`block w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    currentCategory === cat.slug
                      ? "bg-brand-100 text-brand-700 font-medium"
                      : "hover:bg-brand-50 text-text-primary"
                  }`}
                >
                  {cat.icon && <span className="mr-1.5" aria-hidden="true">{cat.icon}</span>}
                  {cat.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}

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

- [ ] **Step 2: Update `FilterDrawer` to forward category props**

Replace the full contents of `components/catalog/FilterDrawer.tsx`:

```tsx
"use client"

import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import type { CatalogFilters, CategoryItem } from "@/types"

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: CatalogFilters
  categories?: CategoryItem[]
}

export function FilterDrawer({ open, onClose, filters, categories }: FilterDrawerProps) {
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
          categories={categories}
          currentCategory={filters.category}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `SortBar` to accept and forward category props**

Replace the full contents of `components/catalog/SortBar.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { FilterDrawer } from "@/components/catalog/FilterDrawer"
import type { CatalogFilters, CategoryItem } from "@/types"

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
  categories?: CategoryItem[]
}

export function SortBar({ total, currentSort, filters, categories }: SortBarProps) {
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
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        categories={categories}
      />
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

- [ ] **Step 4: Verify category pages still compile (no new required props)**

Run: `npx tsc --noEmit`

Expected: No type errors. Category pages don't pass `categories` to `SortBar` — this is fine since it's optional.

- [ ] **Step 5: Commit**

```bash
git add components/catalog/FilterSidebar.tsx components/catalog/FilterDrawer.tsx components/catalog/SortBar.tsx
git commit -m "feat(search): add optional category filter section to FilterSidebar, thread props through FilterDrawer and SortBar"
```

---

### Task 4: Build the `/search` results page

**Files:**
- Create: `app/(shop)/search/page.tsx`
- Create: `app/(shop)/search/loading.tsx`

**Interfaces:**
- Consumes: `parseCatalogFilters`, `searchProducts`, `getParentCategories` from `@/lib/data/catalog` (Task 1)
- Consumes: `FilterSidebar` with `categories` + `currentCategory` props (Task 3)
- Consumes: `SortBar` with `categories` prop (Task 3)
- Consumes: `ProductGrid`, `Pagination` from `@/components/catalog/`

- [ ] **Step 1: Create the loading skeleton**

Create `app/(shop)/search/loading.tsx`:

```tsx
export default function SearchLoading() {
  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="h-7 w-64 bg-border rounded animate-pulse mb-1" />
        <div className="h-4 w-32 bg-border rounded animate-pulse mb-3" />
        <div className="h-10 w-full bg-border rounded animate-pulse mb-4" />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block space-y-3">
            <div className="h-5 w-24 bg-border rounded animate-pulse" />
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

- [ ] **Step 2: Create the search results page**

Create `app/(shop)/search/page.tsx`:

```tsx
import type { Metadata } from "next"
import { parseCatalogFilters, searchProducts, getParentCategories } from "@/lib/data/catalog"
import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import { SortBar } from "@/components/catalog/SortBar"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { Pagination } from "@/components/catalog/Pagination"

export const revalidate = 0

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const q = typeof sp.q === "string" ? sp.q : ""
  return {
    title: q ? `"${q}" — Search Results | Eshopee` : "Search Products | Eshopee",
    description: q
      ? `Find "${q}" on Eshopee — Philippines' favourite online shop`
      : "Search millions of products on Eshopee",
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const filters = parseCatalogFilters(sp)

  const [result, categories] = await Promise.all([
    searchProducts(filters),
    getParentCategories(),
  ])

  const heading = filters.q ? `Results for "${filters.q}"` : "All Products"

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-text-primary mb-0.5">{heading}</h1>
        <p className="text-sm text-text-secondary mb-3">
          {result.total.toLocaleString()} {result.total === 1 ? "product" : "products"} found
        </p>

        <SortBar
          total={result.total}
          currentSort={filters.sort}
          filters={filters}
          categories={categories}
        />

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block">
            <FilterSidebar
              currentPriceMin={filters.priceMin}
              currentPriceMax={filters.priceMax}
              currentRating={filters.rating}
              categories={categories}
              currentCategory={filters.category}
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

- [ ] **Step 3: Full TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/\(shop\)/search/page.tsx app/\(shop\)/search/loading.tsx
git commit -m "feat(search): add /search page with full-text search, category filter, price range, sort, and pagination"
```

---

### Task 5: End-to-end verification

**Files:** none new — verification only.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

Expected: Server starts on `http://localhost:3000` with no build errors.

- [ ] **Step 2: Verify Navbar search**

1. Type "phone" in the Navbar search bar → press Enter → URL becomes `/search?q=phone`, page shows matching products.
2. Click the search icon with an empty input → navigates to `/search`, shows all products.
3. Type "xyz_no_results_expected_12345" → page shows "0 products found" (ProductGrid empty state).

- [ ] **Step 3: Verify filters on search page**

Navigate to `/search?q=phone`:
1. Enter a price range (e.g. `₱100` to `₱5000`) → URL updates, results narrow.
2. Click "4★ & Up" rating → results narrow further.
3. Click a category in the sidebar (e.g. "Electronics") → URL adds `category=electronics`, results filter to that category.
4. Click "All Categories" → `category` param removed, all matching "phone" products show.
5. Click "Clear all" in the sidebar → all filters removed, URL returns to `?q=phone`.

- [ ] **Step 4: Verify sort options**

On `/search?q=phone`:
1. Select "Price: Low to High" → results re-order by price ascending.
2. Select "Newest" → results re-order by `createdAt` descending.
3. Select "Best Seller" → results re-order by `sold` descending.

- [ ] **Step 5: Verify mobile drawer**

Resize browser to mobile width (< 1024px):
1. The "⚙️ Filters" button appears in SortBar.
2. Clicking it opens the FilterDrawer with category + price + rating sections.
3. Selecting a category closes drawer (Link navigation) and URL updates.

- [ ] **Step 6: Verify category pages are unaffected**

Navigate to `/category/electronics` (or any seeded category):
- No category filter section in the sidebar (categories not passed).
- Price range and rating filters still work normally.
- Sort still works.

- [ ] **Step 7: Final commit if any tweaks were made**

```bash
git add -p
git commit -m "fix(search): verification tweaks"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|-------------|------|
| Full-text search (name + description) | Task 1 — `buildSearchWhere` OR clause |
| Category filters | Task 1 type + Task 3 FilterSidebar + Task 4 search page |
| Price range | Already existed; wired to search page in Task 4 |
| Sort | Already existed; wired to search page in Task 4 |
| Functional Navbar search | Task 2 |
| `/search` results page | Task 4 |

**Placeholder scan:** No TBDs, TODOs, "similar to", or steps without code.

**Type consistency:**
- `CatalogFilters.q` (string) used consistently — `parseCatalogFilters` → `buildSearchWhere` → search page
- `CatalogFilters.category` (string | null) used consistently throughout
- `CategoryItem` imported from `@/types` in FilterSidebar and FilterDrawer
- `getParentCategories` returns `CategoryItem[]` matching `FilterSidebarProps.categories?: CategoryItem[]`
- `searchProducts` returns `{ products: ProductCard[], total: number, pageSize: number }` — all three fields consumed by the search page
