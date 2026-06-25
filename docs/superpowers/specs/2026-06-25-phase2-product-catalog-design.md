# Phase 2: Product Catalog — Design Spec

**Date:** 2026-06-25
**Status:** Approved
**Phase:** 2 of 10

---

## Overview

Build the product catalog for Eshopee: category listing pages with filters & sorting, and a product detail page. All filter/sort state lives in the URL via `searchParams`. No API routes — all data fetching is done in async Server Components via Prisma.

---

## Route Structure

New routes added under `app/(shop)/`:

```
app/(shop)/
├── category/
│   └── [parent]/
│       ├── page.tsx          ← top-level category (e.g. /category/electronics)
│       ├── loading.tsx
│       └── [child]/
│           ├── page.tsx      ← subcategory (e.g. /category/electronics/phones)
│           └── loading.tsx
└── product/
    └── [slug]/
        ├── page.tsx          ← product detail
        └── loading.tsx
```

### Category Page Behavior

- **Top-level** (`/category/[parent]`): fetches products from the parent category AND all its children (`parentId` match + child `categoryId`s).
- **Subcategory** (`/category/[parent]/[child]`): fetches products from the child category only.
- Both share the same layout: breadcrumb → sort bar → (filter sidebar + product grid).

### `searchParams` Contract

| Param | Values | Default |
|---|---|---|
| `sort` | `best_seller`, `price_asc`, `price_desc`, `newest` | `best_seller` |
| `price_min` | number (PHP) | `0` |
| `price_max` | number (PHP) | uncapped (omit `lte` filter if absent) |
| `rating` | `3`, `4` | none |
| `page` | number | `1` |

---

## Data Layer

**New file:** `lib/data/catalog.ts`

Exports two functions:

### `getCategoryWithProducts(slug, level, filters)`

- `slug`: the category slug (parent or child)
- `level`: `"parent"` | `"child"` — determines whether to include child category products
- `filters`: parsed from `searchParams` (price range, rating, sort, page)

Returns:
```ts
{
  category: Category & { children: Category[]; parent: Category | null }
  products: ProductCard[]
  total: number        // for pagination
  pageSize: number     // 20
}
```

Prisma query strategy:
- Fetch category by slug, include `children` and `parent`
- For `"parent"`: `categoryId IN [category.id, ...category.children.map(c => c.id)]`
- For `"child"`: `categoryId = category.id`
- Apply `price` range, `rating` gte, `isActive: true`
- Order by sort param → Prisma `orderBy` mapping:
  - `best_seller` → `{ sold: "desc" }`
  - `price_asc` → `{ price: "asc" }`
  - `price_desc` → `{ price: "desc" }`
  - `newest` → `{ createdAt: "desc" }`
- `skip = (page - 1) * 20`, `take = 20`
- Run product query + `count` query in `Promise.all`

### `getProductBySlug(slug)`

Returns full product with:
- `variants` (all fields)
- `shop` (id, name, slug, logo, rating, followersCount)
- `category` + `category.parent` (for breadcrumb)
- `_count: { reviews: true }`

Returns `null` if not found (page calls `notFound()`).

---

## Component Architecture

### Catalog Components (`components/catalog/`)

| Component | Type | Purpose |
|---|---|---|
| `Breadcrumb.tsx` | Server | Home → Category → Subcategory trail |
| `SortBar.tsx` | Client | Sort dropdown + result count + mobile "Filters" button |
| `FilterSidebar.tsx` | Client | Price slider, rating radio buttons — updates URL params |
| `FilterDrawer.tsx` | Client | Mobile slide-over wrapping `FilterSidebar` |
| `ProductGrid.tsx` | Server | Grid of `ProductCard` (reuses existing component) |
| `Pagination.tsx` | Client | Prev/Next + page numbers from total count |

**FilterSidebar** is the only component with meaningful client state — the price range slider holds local state until the user commits (blur/enter), then pushes to URL via `router.replace`. Rating buttons are plain links that set/clear `?rating=`.

### Product Detail Components (`components/product/`)

| Component | Type | Purpose |
|---|---|---|
| `ImageGallery.tsx` | Client | Main image + thumbnail strip; click thumbnail swaps main |
| `VariantPicker.tsx` | Client | Chip group per variant; tracks selection in local state; updates displayed price + stock |
| `AddToCartButton.tsx` | Client | Quantity stepper + disabled "Add to Cart" button; shows toast "Sign in to add to cart" |
| `ShopPanel.tsx` | Server | Shop logo, name, rating, follower count, "Visit Shop" link |

**No new UI primitives** — reuses existing `ProductCard`, `Badge`, `SectionHeader`.

---

## Page Layouts

### Category / Subcategory Page

```
<Breadcrumb />
<SortBar />                        ← result count + sort dropdown + mobile filter button
<div className="grid lg:grid-cols-[220px_1fr]">
  <FilterSidebar />                ← desktop only; FilterDrawer handles mobile
  <ProductGrid />
</div>
<Pagination />
```

### Product Detail Page

```
<Breadcrumb />
<div className="grid lg:grid-cols-[1fr_380px]">
  <ImageGallery />
  <div>                            ← right panel
    <h1>{product.name}</h1>
    <RatingBadge />
    <PriceDisplay />               ← updates when variant selected
    <VariantPicker />
    <AddToCartButton />
    <ShopPanel />
  </div>
</div>
```

---

## Loading & Error States

- Each page has a co-located `loading.tsx` rendering an appropriate skeleton (grid skeleton for listing, detail skeleton for product page). Next.js streams these automatically via Suspense.
- Category not found → `notFound()` → renders existing `app/not-found.tsx`
- Product not found → `notFound()` → same

---

## SEO

Each page exports `generateMetadata` (async, fetches same data as the page — Next.js deduplicates via request cache):

- **Category page:** `title = "{Category Name} | Eshopee"`, description mentions product count
- **Product page:** `title = "{Product Name} | Eshopee"`, `description = product.description.slice(0, 160)`, `openGraph.images[0] = product.images[0]`

Both pages export `revalidate = 60`.

---

## What's Explicitly Out of Scope

- Search bar / keyword filtering (Phase 7)
- Brand / tag multi-select filters (Phase 7)
- Add to Cart functionality (Phase 4)
- Auth gating beyond the disabled button + toast (Phase 3)
- Reviews display (Phase 8)
- Wishlist button (Phase 4+)
