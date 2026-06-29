# Phase 11: Platform Admin Portal — Design Spec

**Date:** 2026-06-27  
**Status:** Approved

---

## Overview

A platform-level admin backoffice at `/admin/*` for managing users, sellers, orders, products, content (banners, categories), and promotions (vouchers, flash sales). Mirrors the seller portal pattern already established in the codebase.

---

## Architecture

### Route Group
New parallel route group `app/(admin)/` alongside `(shop)` and `(seller)`.

### URL Structure
```
/admin/dashboard          ← analytics overview
/admin/sellers            ← shop approval queue + all shops
/admin/users              ← all users, role management
/admin/orders             ← all orders across all shops
/admin/orders/[id]        ← order detail (read-only)
/admin/products           ← all products, deactivate toggle
/admin/categories         ← category CRUD
/admin/banners            ← homepage banner CMS
/admin/vouchers           ← platform voucher management
/admin/flash-sales        ← flash sale list
/admin/flash-sales/new    ← create flash sale
/admin/flash-sales/[id]   ← edit flash sale
```

### Layout
`app/(admin)/admin/(portal)/layout.tsx` — wraps all admin pages with `AdminSidebar`. Same structure as the seller portal layout.

### AdminSidebar
`components/admin/AdminSidebar.tsx` — fixed left sidebar with links to all 9 sections. Follows the same Tailwind + shadcn pattern as `SellerSidebar`.

---

## Access Control

### Middleware
Add `isAdminRoute` matcher in `middleware.ts` for `/admin/:path*`. Check `sessionClaims?.metadata?.role === "ADMIN"`. Redirect to `/` if not admin — same guard pattern as seller routes.

### Server-side second guard
All admin queries and actions in `lib/admin/queries.ts` / `lib/admin/actions.ts` call `auth()` and throw if role is not ADMIN. Defense in depth.

### Assigning admin
Done manually via the Clerk Dashboard: set `publicMetadata.role = "ADMIN"` on the target user. No UI needed — this is a platform-owner-only operation.

---

## Data Layer

- `lib/admin/queries.ts` — all read functions (paginated lists, counts, aggregates)
- `lib/admin/actions.ts` — all mutations (approve/reject shop, toggle product, create voucher, etc.)
- All pages are Server Components; data fetched at the page level via `Promise.all` where multiple queries run in parallel.
- Pagination via `skip`/`take` query params (same pattern as seller product list).

---

## Section Designs

### 1. Dashboard (`/admin/dashboard`)

**Stat cards (top row):**
- Total Users (all time count)
- Total Shops — with breakdown: Active / Pending / Rejected
- Total Orders — all time + today's count
- Total Revenue — sum of `Order.total` where `status IN [PAID, SHIPPED, DELIVERED, CANCELLED]` (exclude REFUNDED)

**Recent activity (below cards):**
- Last 10 orders table — order ID, buyer name, shop name, total, status badge, date
- Last 5 PENDING seller applications — shop name, owner email, registered date, inline Approve / Reject buttons

All data fetched in a single `Promise.all` in the page Server Component.

---

### 2. Sellers (`/admin/sellers`)

Paginated table of all `Shop` records.

**Columns:** Shop name, owner email, status badge (PENDING / ACTIVE / REJECTED), created date, Actions.

**Actions:**
- PENDING shops: Approve button + Reject button
- ACTIVE shops: Reject button (to suspend)
- REJECTED shops: Approve button (to reinstate)

**Reject flow:** Clicking Reject opens an inline form/modal to enter `rejectionReason`. Submits via server action.

**Approve side-effect:** Approving a shop:
1. Sets `Shop.status = ACTIVE`, clears `rejectionReason`
2. Sets `User.role = SELLER` on the shop owner in the DB
3. Calls Clerk Backend API (`clerkClient.users.updateUserMetadata`) to sync `publicMetadata.role = "SELLER"`

**Reject side-effect:** Sets `Shop.status = REJECTED`, sets `rejectionReason`, sets `User.role = BUYER` in DB and Clerk.

---

### 3. Users (`/admin/users`)

Paginated table of all `User` records.

**Columns:** Name, email, role badge, created date, Actions.

**Actions:**
- View orders (links to `/admin/orders?userId=...`)
- Promote to SELLER (updates DB + Clerk metadata)
- Demote to BUYER (updates DB + Clerk metadata)

No hard delete. No ban flag in current schema — demotion to BUYER effectively locks out seller access.

---

### 4. Orders (`/admin/orders`)

Paginated table of all `Order` records across all shops.

**Columns:** Order ID (short), buyer name, shop name, total, status badge, date.

**Filter:** Status filter dropdown (ALL / PENDING / PAID / SHIPPED / DELIVERED / CANCELLED / REFUNDED).

**Row click:** Links to `/admin/orders/[id]` — full read-only order detail showing items, shipping address, payment info, shipment tracking.

No admin mutations on orders — order lifecycle is managed by sellers and buyers.

---

### 5. Products (`/admin/products`)

Paginated table of all `Product` records across all shops.

**Columns:** Product name, shop name, category, price, stock, active status toggle, created date.

**Actions:**
- Toggle `isActive` — deactivates/reactivates a listing without deleting it. Uses inline server action (same pattern as seller product toggle).

No hard delete from admin UI.

---

### 6. Categories (`/admin/categories`)

Table of all `Category` records showing parent/child hierarchy.

**Display:** Flat list with indentation for children (parent name shown in a column).

**Actions per row:** Edit (inline or modal), Delete.

**Delete guard:** Blocked if any `Product` references the category — show error message instead.

**Create form:** Name, slug (auto-generated from name, editable), icon (emoji or URL), parent category (optional dropdown). Submitted via server action.

---

### 7. Banners (`/admin/banners`)

Table of all `Banner` records.

**Columns:** Image thumbnail, title, link URL, display order, active toggle, created date, Actions.

**Actions:** Edit, Delete.

**Create/Edit form fields:**
- Image — uploaded via UploadThing (same `uploadthing` setup already configured)
- Title (optional)
- Link URL (optional)
- Display order (number — controls homepage carousel sequence)
- Is Active toggle

---

### 8. Vouchers (`/admin/vouchers`)

Table of all `Voucher` records.

**Columns:** Code, discount type, discount value, min spend, expiry date, active toggle, Actions.

**Actions:** Edit, Deactivate (sets `isActive: false`). No hard delete.

**Create form fields:** All `Voucher` model fields — code, title, discount type (PERCENT/FIXED), discount value, min spend, max discount (optional), expires at, usage limit (optional).

---

### 9. Flash Sales (`/admin/flash-sales`)

**List page (`/admin/flash-sales`):** Table of all `FlashSale` records — title, start/end datetime, active toggle, item count, Actions (Edit, Delete).

**Create/Edit page (`/admin/flash-sales/new` and `/admin/flash-sales/[id]`):**
- Flash sale metadata: title, start datetime, end datetime, is active
- Product picker: search/select products to add, set `salePrice` and `stock` allocation per product
- Each selected product creates a `FlashSaleItem` record

**Delete:** Server action deletes all `FlashSaleItem` records for the sale first, then deletes the `FlashSale` (schema has no cascade — must delete children manually).

---

## Components

| Component | Path | Purpose |
|---|---|---|
| `AdminSidebar` | `components/admin/AdminSidebar.tsx` | Fixed left nav with 9 section links |
| `AdminStatCard` | `components/admin/AdminStatCard.tsx` | Reusable stat display card |
| `ShopStatusBadge` | `components/admin/ShopStatusBadge.tsx` | PENDING/ACTIVE/REJECTED color badge |
| `OrderStatusBadge` | `components/admin/OrderStatusBadge.tsx` | Reusable across orders tables |

Reuse existing shadcn components (Table, Badge, Button, Dialog, Input, Select) throughout.

---

## Clerk Integration

Seller approval and user role changes require syncing to Clerk. Use the Clerk Backend SDK:

```ts
import { clerkClient } from "@clerk/nextjs/server"

const clerk = await clerkClient()
await clerk.users.updateUserMetadata(clerkId, {
  publicMetadata: { role: "SELLER" }, // or "BUYER"
})
```

This is called inside server actions after the DB update succeeds.

---

## Out of Scope for Phase 11

- Admin audit log (who changed what)
- Email notifications to sellers on approval/rejection (can be added later)
- Revenue charts / graphs (stat counts only, no chart library needed)
- Admin user creation UI (done via Clerk Dashboard manually)
