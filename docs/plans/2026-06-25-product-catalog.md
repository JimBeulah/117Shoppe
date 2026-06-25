# Product Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the dynamic e-commerce product catalog, including a functional search bar, a search and listing page with price/rating/category filters and sorting, category-specific pages, and a feature-rich, high-performance Product Detail page with variant selection and image galleries.

**Architecture:** 
- Route segments leverage Next.js 16 `unstable_instant = { prefetch: 'static' }` for instant client-side navigations and page loads.
- Product search, sorting, and filtering logic is centralized into a testable utility `lib/catalog.ts` using Prisma query building.
- Server-side caching uses `'use cache'` for details that don't change frequently (e.g. product definitions, categories), while dynamic/client features stream in behind `<Suspense>`.
- Client interactivity (active gallery image, variants, quantities) is separated into client components.

**Tech Stack:** Next.js 16, React 19, Prisma, Tailwind CSS v4, Lucide Icons, Vitest.

---

## Action Items

### Task 1: Centralized Catalog Query Builder & TDD

We will create a query builder helper for Prisma product searches to handle search keywords, category filtering, price ranges, rating boundaries, and sorting. This logic is prone to query errors, so we will build it using TDD.

**Files:**
- Create: `lib/catalog.ts`
- Create: `tests/lib/catalog.test.ts`

**Step 1: Write the failing tests**
Create the test suite in `tests/lib/catalog.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildProductQuery } from '@/lib/catalog'

describe('buildProductQuery', () => {
  it('adds search keyword query for name or description', () => {
    const query = buildProductQuery({ q: 'earbuds' })
    expect(query.where).toEqual({
      isActive: true,
      OR: [
        { name: { contains: 'earbuds', mode: 'insensitive' } },
        { description: { contains: 'earbuds', mode: 'insensitive' } },
      ],
    })
  })

  it('filters by category slug', () => {
    const query = buildProductQuery({ categorySlug: 'electronics' })
    expect(query.where).toEqual({
      isActive: true,
      category: { slug: 'electronics' },
    })
  })

  it('filters by price range', () => {
    const query = buildProductQuery({ minPrice: 500, maxPrice: 1500 })
    expect(query.where).toEqual({
      isActive: true,
      price: {
        gte: 500,
        lte: 1500,
      },
    })
  })

  it('handles sorting options correctly', () => {
    const queryPriceAsc = buildProductQuery({ sortBy: 'price_asc' })
    expect(queryPriceAsc.orderBy).toEqual({ price: 'asc' })

    const querySales = buildProductQuery({ sortBy: 'sales' })
    expect(querySales.orderBy).toEqual({ sold: 'desc' })
  })
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test`
Expected: FAIL (Cannot find module `@/lib/catalog` or `buildProductQuery`)

**Step 3: Write minimal implementation**
Create `lib/catalog.ts`:
```typescript
import { Prisma } from '@/lib/generated/prisma/client'

interface QueryArgs {
  q?: string
  categorySlug?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  sortBy?: string
}

export function buildProductQuery(args: QueryArgs) {
  const where: Prisma.ProductWhereInput = { isActive: true }

  if (args.q) {
    where.OR = [
      { name: { contains: args.q, mode: 'insensitive' } },
      { description: { contains: args.q, mode: 'insensitive' } },
    ]
  }

  if (args.categorySlug) {
    where.category = { slug: args.categorySlug }
  }

  if (args.minPrice !== undefined || args.maxPrice !== undefined) {
    where.price = {}
    if (args.minPrice !== undefined) where.price.gte = args.minPrice
    if (args.maxPrice !== undefined) where.price.lte = args.maxPrice
  }

  if (args.rating !== undefined) {
    where.rating = { gte: args.rating }
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { rating: 'desc' }

  if (args.sortBy === 'price_asc') {
    orderBy = { price: 'asc' }
  } else if (args.sortBy === 'price_desc') {
    orderBy = { price: 'desc' }
  } else if (args.sortBy === 'sales') {
    orderBy = { sold: 'desc' }
  } else if (args.sortBy === 'latest') {
    orderBy = { createdAt: 'desc' }
  }

  return { where, orderBy }
}
```

**Step 4: Run test to verify it passes**
Run: `npm run test`
Expected: PASS

**Step 5: Commit**
```bash
git add lib/catalog.ts tests/lib/catalog.test.ts
git commit -m "feat: add catalog query builder with tests"
```

---

### Task 2: Make Search Bar in Navbar Functional

We will modify the Navbar component to navigate to `/search?q=XYZ` when a search is triggered, enabling searching from any page.

**Files:**
- Modify: `components/layout/Navbar.tsx`

**Step 1: Check existing test or write mock test**
Add search interaction logic or test verification.

**Step 2: Implement search form validation**
Modify the search elements inside `components/layout/Navbar.tsx` (around lines 23-34) to wrap the input and button inside a `<form>` element.
```tsx
// Wrap search section in form:
import { useRouter } from "next/navigation"
// ...
const router = useRouter()
const handleSearchSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  if (search.trim()) {
    router.push(`/search?q=${encodeURIComponent(search.trim())}`)
  }
}
// Return form block:
<form onSubmit={handleSearchSubmit} className="flex-1 flex items-center bg-white rounded-sm overflow-hidden max-w-2xl">
  <input
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search products, shops, brands..."
    className="flex-1 px-4 py-2 text-text-primary text-sm outline-none"
  />
  <button type="submit" aria-label="Search" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 transition-colors">
    <Search size={18} />
  </button>
</form>
```

**Step 3: Verify navigation**
Launch local dev server (`npm run dev`) and test typing a search query and hitting enter. It should navigate to `/search?q=query`.

**Step 4: Commit**
```bash
git add components/layout/Navbar.tsx
git commit -m "feat: make search bar functional"
```

---

### Task 3: Create Search & Listing Page with Filters and Sorting

We will build the `/search` page. It will support parsing multiple filter queries, display a premium-looking sidebar for categories/price/rating filtering, a top bar for sorting, and list products dynamically.

**Files:**
- Create: `app/(shop)/search/page.tsx`
- Create: `app/(shop)/search/ProductSearchList.tsx`

**Step 1: Build the route layout wrapper**
Create `app/(shop)/search/page.tsx` to handle Next.js 16 instant navigation standards:
```tsx
import { Suspense } from 'react'
import ProductSearchList from './ProductSearchList'

export const unstable_instant = { prefetch: 'static' }

interface PageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    minPrice?: string
    maxPrice?: string
    rating?: string
    sortBy?: string
    page?: string
  }>
}

export default function SearchPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-center text-text-secondary">Searching catalog...</div>}>
      <ProductSearchList searchParams={searchParams} />
    </Suspense>
  )
}
```

**Step 2: Build the search logic and user interface**
Create `app/(shop)/search/ProductSearchList.tsx` (an async Server Component):
- Fetch products based on the query builder using Prisma.
- Fetch categories for the sidebar.
- Implement UI layout with a 2-column grid:
  - Sidebar: Category links, Price Range input (Form with inputs for min and max), Rating stars filters (5 stars down to 1 star).
  - Main panel: Sorting tabs (Popular, Latest, Top Sales, Price Low/High), Product Grid rendering `ProductCard` components, and Empty states with elegant illustrations if no results are found.
  - Form handles client-side param updates using links or simple query strings.

**Step 3: Verify styling and filter logic**
Open `http://localhost:3000/search` and test filters. Ensure styling complies with the high-aesthetics requirement (beautiful hover borders, responsive layout, clear active filters indicator).

**Step 4: Commit**
```bash
git add app/\(shop\)/search/page.tsx app/\(shop\)/search/ProductSearchList.tsx
git commit -m "feat: implement product search page with filters and sorting"
```

---

### Task 4: Create Category Pages

We will implement the `/category/[slug]` route. It will display the active category info, and reuse the search listing layout so categories automatically inherit the filters and sorting capabilities.

**Files:**
- Create: `app/(shop)/category/[slug]/page.tsx`
- Create: `app/(shop)/category/[slug]/CategoryProductList.tsx`

**Step 1: Create Category route wrapper**
Create `app/(shop)/category/[slug]/page.tsx`:
```tsx
import { Suspense } from 'react'
import CategoryProductList from './CategoryProductList'

export const unstable_instant = { prefetch: 'static' }

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    minPrice?: string
    maxPrice?: string
    rating?: string
    sortBy?: string
    page?: string
  }>
}

export default function CategoryPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-center text-text-secondary">Loading category catalog...</div>}>
      <CategoryProductList params={params} searchParams={searchParams} />
    </Suspense>
  )
}
```

**Step 2: Create Category list component**
Create `app/(shop)/category/[slug]/CategoryProductList.tsx`:
- Retrieve active Category details. If not found, call `notFound()`.
- Load subcategories (if any exist) to display as sub-filters.
- Fetch products matching this category (and subcategories recursively if parent category).
- Render category breadcrumbs, title banner, and the standard product list with filters & sorting.

**Step 3: Verify routing**
Navigate to a category from the CategoryBar (e.g. `/category/electronics`). Verify products belong to that category, and filtering/sorting operates within it.

**Step 4: Commit**
```bash
git add app/\(shop\)/category/\[slug\]/page.tsx app/\(shop\)/category/\[slug\]/CategoryProductList.tsx
git commit -m "feat: implement category listing pages"
```

---

### Task 5: Create Product Detail Page (Data Fetching & Base UI)

We will build the product detail page `/product/[slug]`. We will implement static info caching using Next.js 16 `'use cache'` directive for optimal loading speeds, and stream dynamic updates (like live review lists) via Suspense.

**Files:**
- Create: `app/(shop)/product/[slug]/page.tsx`

**Step 1: Implement base route with Suspense**
Create `app/(shop)/product/[slug]/page.tsx` with `unstable_instant`:
```tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { ProductInteractive } from '@/components/product/ProductInteractive'

export const unstable_instant = { prefetch: 'static' }

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 bg-bg-page">
      <Suspense fallback={<div className="py-12 text-center text-text-secondary">Loading product details...</div>}>
        {params.then(({ slug }) => (
          <ProductInfo slug={slug} />
        ))}
      </Suspense>

      <Suspense fallback={<div className="py-6 text-center text-text-secondary">Loading related products...</div>}>
        {params.then(({ slug }) => (
          <RelatedProducts slug={slug} />
        ))}
      </Suspense>
    </div>
  )
}

async function ProductInfo({ slug }: { slug: string }) {
  'use cache'
  
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: true,
      shop: true,
      variants: true,
      reviews: {
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!product) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-text-secondary">
        Category &gt; {product.category.name} &gt; {product.name}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-lg shadow-sm">
        <ProductInteractive product={product} />

        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{product.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
              <span className="text-reward">★ {product.rating.toFixed(1)}</span>
              <span>{product.reviewCount} Reviews</span>
              <span>{product.sold} Sold</span>
            </div>
          </div>

          <div className="bg-brand-50 p-4 rounded-md">
            <span className="text-3xl font-extrabold text-accent-sale">
              ₱{product.price.toLocaleString('en-PH')}
            </span>
          </div>

          <div className="space-y-2 border-t pt-4">
            <h2 className="text-sm font-semibold text-text-primary">Shop Info</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center font-bold text-brand-700">
                {product.shop.name[0]}
              </div>
              <div>
                <p className="font-semibold text-text-primary">{product.shop.name}</p>
                <p className="text-xs text-text-secondary">Rating: {product.shop.rating.toFixed(1)} ★ | Followers: {product.shop.followersCount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Product Description</h2>
          <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">{product.description}</p>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Customer Reviews</h2>
          {product.reviews.length === 0 ? (
            <p className="text-sm text-text-secondary">No reviews yet for this product.</p>
          ) : (
            <div className="space-y-4">
              {product.reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{review.user.name}</span>
                    <span className="text-xs text-text-secondary">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className="text-reward text-xs">{"★".repeat(review.rating)}</span>
                  <p className="text-sm text-text-secondary mt-1">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

async function RelatedProducts({ slug }: { slug: string }) {
  const current = await prisma.product.findUnique({
    where: { slug },
    select: { categoryId: true, id: true }
  })
  
  if (!current) return null
  
  const related = await prisma.product.findMany({
    where: { categoryId: current.categoryId, id: { not: current.id }, isActive: true },
    include: { shop: { select: { name: true, slug: true } } },
    take: 4,
  })

  if (related.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary mb-4">You May Also Like</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* We can map here to custom cards or existing ProductCard */}
      </div>
    </div>
  )
}
```

**Step 2: Commit base product page**
```bash
git add app/\(shop\)/product/\[slug\]/page.tsx
git commit -m "feat: add product detail page framework and related products"
```

---

### Task 6: Create Interactive Product Client Component

We will create the interactive section of the Product Detail page, handling product gallery selection, variants (color/size/type), quantity adjustments, and "Add to Cart"/"Buy Now" event triggers.

**Files:**
- Create: `components/product/ProductInteractive.tsx`

**Step 1: Implement ProductInteractive client component**
Create `components/product/ProductInteractive.tsx` with `"use client"`:
- Manage `activeImageIndex` state.
- Manage `selectedVariant` state (updates price and SKU if selected).
- Manage `quantity` state (ensures it doesn't exceed available variant/product stock).
- Action buttons: "Add to Cart" and "Buy Now" (for now, display success toast / console log until Cart system is ready in Phase 3).
- Responsive gallery layout with hover-to-select for thumbnails.

**Step 2: Verify interactive gallery and variants**
Navigate to a product page. Click variants and verify that price or details reflect the active selection. Verify quantity selector constraints work.

**Step 3: Commit client components**
```bash
git add components/product/ProductInteractive.tsx
git commit -m "feat: implement interactive gallery and variants component for product detail"
```

---

### Task 7: Catalog Verification and Integration Tests

We will write integration tests verifying the rendering structure of the search catalog and detail pages, ensuring no regressions.

**Files:**
- Create: `tests/catalog-integration.test.ts`

**Step 1: Write integration tests**
Add a test suite verifying routing and parsing:
- Validate url query parameters mapping.
- Test category matching logic.

**Step 2: Execute test suite**
Run: `npm run test`
Expected: PASS

**Step 3: Commit and clean up**
```bash
git add tests/catalog-integration.test.ts
git commit -m "test: add integration test suite for product catalog"
```
