# Phase 6: Seller Portal — Design Spec

**Date:** 2026-06-27
**Status:** Approved
**Phase:** 6 of 10

---

## Overview

Build the Seller Portal — a protected area where users can register a shop, upload and manage products, and process orders. Modelled on Shopee's seller centre. Architecture follows the established pattern: Server Components for data fetching, Server Actions for mutations, isolated client components only where interactivity requires it (image uploader, variant matrix builder, cancel modal).

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Seller registration | Admin-approved (Option B) | Prevents spam shops; admin approves via Prisma Studio this phase |
| Dashboard style | Full Shopee-style overview | Stats + pending actions + recent orders |
| Variant system | Full 2D matrix (Color × Size) | Matches Shopee's product listing capability |
| Order actions | Arrange shipment + cancel | Core seller operations |
| Image uploads | UploadThing | Next.js-native, zero config |
| Admin approval UI | Seller-side only this phase | Admin panel is a later phase |

---

## Architecture

```
app/(seller)/
├── layout.tsx                        ← update: sidebar + topbar shell
└── seller/
    ├── onboarding/
    │   └── page.tsx                  ← shop registration form
    ├── dashboard/
    │   └── page.tsx                  ← stats overview
    ├── products/
    │   ├── page.tsx                  ← product list table
    │   ├── new/
    │   │   └── page.tsx              ← product upload form
    │   └── [id]/
    │       └── edit/
    │           └── page.tsx          ← edit product
    └── orders/
        ├── page.tsx                  ← order list with status tabs
        └── [id]/
            └── page.tsx              ← order detail + ship/cancel actions

lib/
├── seller/
│   ├── actions.ts                    ← all seller Server Actions
│   └── queries.ts                    ← all seller data fetching functions
components/
└── seller/
    ├── SellerSidebar.tsx
    ├── VariantMatrixBuilder.tsx      ← client component
    ├── ProductImageUploader.tsx      ← client component (UploadThing)
    └── CancelOrderModal.tsx          ← client component
```

**URL paths:** `/seller/onboarding`, `/seller/dashboard`, `/seller/products`, `/seller/products/new`, `/seller/products/[id]/edit`, `/seller/orders`, `/seller/orders/[id]`

---

## Schema Changes

One migration required. No existing fields removed or changed.

```prisma
enum ShopStatus {
  PENDING
  ACTIVE
  REJECTED
}

model Shop {
  // ... all existing fields unchanged
  status          ShopStatus @default(PENDING)
  rejectionReason String?
}

model Product {
  // ... all existing fields unchanged
  variantOptions Json?
  // Shape: [{name:"Color", values:["Red","Blue"]}, {name:"Size", values:["S","M","L"]}]
  // Max 2 groups, max 10 values each.
  // ProductVariant.name stores the composite label e.g. "Red / S"
}
```

---

## Seller Onboarding Flow

Three middleware-enforced states:

### State 1 — No shop → `/seller/onboarding`
Form fields: shop name, slug (auto-generated from name, editable), logo (UploadThing), banner (UploadThing).

On submit (Server Action):
1. Create `Shop` record with `status: PENDING`
2. Flip `User.role` to `SELLER` in Prisma
3. Sync role to Clerk `publicMetadata` via `clerkClient().updateUserMetadata()`
4. Redirect to pending holding page

### State 2 — Shop pending
Holding page: "Your shop is under review." No sidebar. No access to dashboard/products/orders. Middleware redirects any `/seller/*` (except `/seller/onboarding`) to this state while `shop.status === PENDING`.

### State 3 — Shop active → `/seller/dashboard`
Full portal access. Middleware gate: `User.role === SELLER` AND `shop.status === ACTIVE`.

### Admin approval (no UI this phase)
Admin sets `shop.status = 'ACTIVE'` via Prisma Studio. Seller's next page load passes the middleware gate and reaches the dashboard.

### Middleware logic (update existing)
```
/seller/* request
  → not signed in          → redirect /sign-in
  → signed in, no shop     → redirect /seller/onboarding
  → shop PENDING           → redirect /seller/pending (holding page)
  → shop REJECTED          → redirect /seller/rejected (show rejection reason from shop.rejectionReason, "contact support" note)
  → shop ACTIVE            → allow through
```

---

## Seller Dashboard (`/seller/dashboard`)

Server Component — all data fetched in parallel via `Promise.all`.

### Stat Cards (row of 4)
| Card | Query |
|---|---|
| Total Revenue | Sum of `order.total` where `status IN [PAID, SHIPPED, DELIVERED]` |
| Total Orders | Count of all orders for this shop |
| Products Listed | Count of `isActive = true` products |
| Pending Orders | Count of `status = PAID` orders (needs shipment) |

### Recent Orders Panel (left column)
Last 10 orders — order ID, buyer name, items count, total, status badge, date. Row click → `/seller/orders/[id]`.

### Top Products Panel (right column)
Top 5 products by `sold` count — thumbnail, name, units sold, stock level. Stock ≤ 5 renders in orange as a low-stock alert.

### Sidebar Navigation (persistent)
- Dashboard
- Products → All Products, Add Product
- Orders
- Shop Settings

---

## Product Management

### Product List (`/seller/products`)
Table: thumbnail, name, price, stock, active toggle (inline Server Action), sold count, Edit and Delete actions. Paginated at 20/page. "Add Product" CTA top-right.

### Product Form (`/seller/products/new` and `/seller/products/[id]/edit`)

**Section 1 — Basic Info**
- Name (text)
- Description (textarea)
- Category (select from seeded Category tree — parent then child)
- Price (number)
- Original Price (number, optional — renders as strikethrough on product page)

**Section 2 — Images**
- UploadThing multi-image uploader (client component)
- Drag-to-reorder; first image is the cover
- Maximum 9 images

**Section 3 — Variants (client component: `VariantMatrixBuilder`)**
- Toggle: "This product has variants"
- If OFF: single stock field on the form
- If ON:
  - Add up to 2 variant groups (e.g., Color, Size)
  - Each group: group name + up to 10 option values (add/remove chips)
  - Matrix auto-generates from the cross-product of both groups
  - Each cell editable: price, stock, SKU (optional), image (optional)
  - Removing a group collapses matrix back

**Section 4 — Publish**
- `isActive` toggle — inactive products are hidden from the buyer-facing shop

**Server Action on submit:**
- Upsert `Product` (including `variantOptions` JSON)
- Delete existing `ProductVariant` rows for this product, then bulk-insert new ones
- Wrapped in a Prisma `$transaction`
- On success: redirect to `/seller/products`

---

## Order Management

### Order List (`/seller/orders`)

Status tabs: **All | To Ship (PAID) | Shipped | Delivered | Cancelled**

Each row: order ID, buyer name, items summary (e.g., "Red Nike Shirt × 2 + 1 more"), total, date, status badge, context-sensitive action button:
- PAID → "Arrange Shipment" (links to detail page, shipment panel focused)
- Others → "View"

### Order Detail (`/seller/orders/[id]`)

**Sections:**
1. **Order Summary** — order ID, date, status badge
2. **Buyer Info** — full name, phone, full shipping address
3. **Items** — product thumbnail, name, variant label, quantity, unit price, line subtotal
4. **Payment Summary** — subtotal, shipping fee, grand total
5. **Shipment Panel** (context-sensitive):
   - `PAID`: form with courier name + tracking number → "Mark as Shipped" Server Action
     - Sets `Order.status = SHIPPED`
     - Creates/updates `Shipment` record with courier + tracking
   - `SHIPPED`: courier and tracking number shown, read-only
   - `DELIVERED` / `CANCELLED`: read-only history
6. **Cancel Order** — visible only when `status = PAID`
   - Opens `CancelOrderModal` (client component) for confirmation
   - Server Action sets `Order.status = CANCELLED`

---

## Image Uploads

UploadThing handles all file uploads in this phase:
- `productImages` endpoint — multi-file, images only, max 9 files, max 4MB each
- `shopLogo` endpoint — single file, images only, max 2MB
- `shopBanner` endpoint — single file, images only, max 4MB

All endpoints protected — only authenticated users with role SELLER can upload.

---

## Data Flow Summary

```
Seller action           Server Action           Prisma
──────────────          ─────────────           ──────
Register shop      →    createShop()        →   Shop(PENDING) + User.role=SELLER
Upload product     →    upsertProduct()     →   Product + ProductVariant[]
Edit product       →    upsertProduct()     →   delete old variants, insert new
Toggle active      →    toggleProduct()     →   Product.isActive flip
Delete product     →    deleteProduct()     →   soft delete (isActive=false) — preserves OrderItem history
Mark shipped       →    shipOrder()         →   Order.status=SHIPPED + Shipment upsert
Cancel order       →    cancelOrder()       →   Order.status=CANCELLED
```

---

## Error Handling

- All Server Actions validate that the authenticated user's `shopId` owns the resource being mutated (prevents IDOR — a seller cannot ship or cancel another seller's orders)
- Slug uniqueness enforced at DB level (`Shop.slug @unique`) — form shows inline error on conflict
- UploadThing errors surfaced inline in the uploader component
- Prisma transaction failures return a typed error to the form via `useActionState`

---

## Out of Scope (later phases)

- Admin approval UI (Phase 9+ or dedicated admin phase)
- Shop analytics / charts
- Voucher creation by sellers
- Flash sale enrollment
- Real-time order notifications (Phase 9 — chat/notifications)
- Packing slip / shipping label printing
