# Shop Storefront Page — Design Spec

**Date:** 2026-06-29
**Status:** Approved

## Overview

Add a public-facing storefront page for each seller shop at `/shop/[slug]`, mirroring the per-store pages on Shopee. The route already has a "Visit Shop" link from the `ShopPanel` on every product detail page — this spec closes that gap.

## Architecture

### Route

`app/(shop)/shop/[slug]/page.tsx` — inside the existing `(shop)` route group so it inherits the Navbar/footer layout automatically. Receives both `params` (slug) and `searchParams` (sort/filter/page).

### Data Layer (`lib/data/catalog.ts`)

Two new cached data functions:

**`getShopBySlug(slug: string)`**
Fetches:
- `Shop`: id, name, slug, logo, banner, rating, followersCount, createdAt, status
- `_count`: products (active only)
- Returns `null` if not found or shop is not `ACTIVE`

**`getShopProducts(shopId: string, filters: CatalogFilters)`**
- Same `CatalogFilters` type used by `searchProducts` and `getCategoryWithProducts`
- Adds `shopId` and `isActive: true` to the `where` clause
- Returns `{ products: ProductCard[], total: number, pageSize: number }`

### Server Action (`lib/actions/shop.ts`)

**`toggleFollow(shopId: string)`**
- Requires auth — throws if no `userId`
- Upserts or deletes a `ShopFollow` row
- Calls `revalidatePath('/shop/[slug]')` after mutation
- Returns `{ following: boolean, followerCount: number }`

## Components

### `app/(shop)/shop/[slug]/page.tsx` (Server Component)

1. Calls `getShopBySlug(slug)` — 404 if null
2. Calls `auth()` to get current userId
3. If authenticated, queries `ShopFollow` to determine `initialFollowing`
4. Calls `getShopProducts(shop.id, filters)` in parallel with the follow check
5. Renders `ShopHeader` + sort/filter/product grid layout

### `components/shop/ShopHeader.tsx` (Server Component)

- Full-width banner: uses `shop.banner` image if set, otherwise a solid `brand-600` strip (h-40)
- Overlaid at the bottom of the banner: logo circle (72px, white ring), shop name, stat chips
- Stat chips: `★ {rating}` · `{productCount} products` · `{followerCount} followers` · `Joined {month year}`
- `FollowButton` positioned to the right of the logo row

### `components/shop/FollowButton.tsx` (Client Component)

Props: `shopId: string`, `initialFollowing: boolean`, `initialCount: number`

Behavior:
- Renders "Follow" (outlined brand button) or "Following" (filled brand button)
- On click: calls `toggleFollow` server action, optimistically updates local state (±1 follower count, toggle label)
- If user is unauthenticated (`shopId` present but no session): redirects to `/sign-in`
- Shows a loading spinner during the action to prevent double-clicks

## Page Layout

```
┌─────────────────────────────────────────┐
│           Banner (h-40, full width)      │
│  ┌──────┐                               │
│  │ Logo │  Shop Name          [Follow]  │
│  └──────┘  ★4.8 · 42 products · 1.2K followers · Joined Jun 2026
└─────────────────────────────────────────┘
[Sort Bar: Best Seller ▾ | Price ▾ | ...]
┌──────────┬──────────────────────────────┐
│ Filter   │  Product Grid (4-col)        │
│ Sidebar  │  ...                         │
│          │  [Pagination]                │
└──────────┴──────────────────────────────┘
```

## Error States

- Shop not found or not ACTIVE → `notFound()` → renders app's 404 page
- Shop has no products → `ProductGrid` renders an empty state message ("No products yet")

## What Is Not In Scope

- About/Reviews tabs (schema has no `Shop.description` field; can be added later)
- Chat button (requires messaging feature)
- Infinite scroll (no other page uses it; pagination is consistent)
