# Phase 8: Reviews & Ratings — Design Spec

**Date:** 2026-06-30  
**Status:** Approved

---

## Overview

Adds product reviews, star ratings, and seller replies to Eshopee. Mirrors Shopee's UX: buyers rate purchased products from their orders page via a modal; reviews appear on the product page; sellers reply from their portal.

---

## Constraints & Rules

- **Verified purchases only** — a buyer can only review a product if they have at least one DELIVERED order containing that product.
- **One review per product** — a buyer can submit exactly one review per product regardless of how many times they purchased it. Reviews are permanent (no edit or delete).
- **Text + rating only** — no image uploads on reviews for this phase.
- **One reply per review** — a seller can reply once per review (`ReviewReply.reviewId` is `@unique` in the schema). Replies are permanent.

---

## Prisma Models (already exist — no migration needed)

```prisma
model Review {
  id        String   @id @default(cuid())
  userId    String
  productId String
  orderId   String?          // populated with the qualifying order id
  rating    Int              // 1–5
  comment   String?
  images    String[]         // unused this phase
  createdAt DateTime @default(now())

  user    User         @relation(fields: [userId], references: [id])
  product Product      @relation(fields: [productId], references: [id])
  reply   ReviewReply?
}

model ReviewReply {
  id       String @id @default(cuid())
  reviewId String @unique
  shopId   String
  comment  String

  review Review @relation(fields: [reviewId], references: [id])
  shop   Shop   @relation(fields: [shopId], references: [id])
}
```

`Product.rating` (Float) and `Product.reviewCount` (Int) are denormalized fields updated on every new review via a Prisma transaction.

---

## Architecture

### New Pages

| Route | File | Description |
|-------|------|-------------|
| `/account/orders` | `app/(shop)/account/orders/page.tsx` | My Purchases — buyer order history with Rate/Reviewed buttons |
| `/account/orders/loading.tsx` | `app/(shop)/account/orders/loading.tsx` | Skeleton loader |
| `/seller/reviews` | `app/(seller)/seller/(portal)/reviews/page.tsx` | Seller reviews management with reply forms |

### New Data Functions — `lib/data/reviews.ts`

```ts
getProductReviews(productId: string, page?: number): Promise<ReviewWithUser[]>
// Fetches reviews with user name, rating, comment, createdAt, and seller reply.
// 10 per page, ordered by createdAt desc.

getUserReviewedProductIds(userId: string): Promise<Set<string>>
// Returns the set of productIds this user has already reviewed.
// Used on the orders page to decide Rate vs. Reviewed badge.
```

### New Server Action — `lib/actions/reviews.ts`

```ts
submitReview(data: { productId: string; orderId: string; rating: number; comment: string }): Promise<ActionResult>
```

**Steps:**
1. Auth check — `getCurrentUser()`, reject if not signed in.
2. Verify the provided `orderId` belongs to this user, contains this `productId`, and has `status = DELIVERED`. Reject otherwise.
3. Check for existing `Review` where `(userId, productId)` — reject with "already reviewed" if found.
4. Prisma transaction:
   - `prisma.review.create(...)` with the orderId set
   - Recompute average: `prisma.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true })`
   - `prisma.product.update({ where: { id: productId }, data: { rating: avg, reviewCount: count } })`
5. `revalidatePath(/product/${slug})` — revalidates the product page so the new rating shows.
6. Return `{ success: true }`.

### Additions to `lib/seller/queries.ts`

```ts
getShopReviews(shopId: string): Promise<ShopReviewWithProduct[]>
// Reviews for all products in this shop, newest first.
// Includes: product name/image, buyer name, rating, comment, createdAt, existing reply.
```

### Additions to `lib/seller/actions.ts`

```ts
replyToReview(reviewId: string, comment: string): Promise<ActionResult>
```

**Steps:**
1. Auth + shop ownership check via `getCurrentShop()`.
2. Confirm the review belongs to a product in this shop.
3. Confirm no existing `ReviewReply` for this reviewId.
4. `prisma.reviewReply.create(...)`.
5. `revalidatePath('/seller/reviews')`.

---

## New Components

### Buyer-side

| Component | Type | Purpose |
|-----------|------|---------|
| `components/account/OrderCard.tsx` | Server | Renders one order with its items; shows Rate or Reviewed badge per item |
| `components/reviews/ReviewModal.tsx` | Client | Modal with star picker + textarea + submit; `useTransition` for loading state |
| `components/reviews/StarPicker.tsx` | Client | 5 interactive star buttons; selected stars fill orange (`text-reward`) |
| `components/product/ReviewsSection.tsx` | Server | Fetches + renders product reviews below the description |
| `components/product/RatingBreakdown.tsx` | Server | 5-bar distribution chart showing count per star level |
| `components/product/ReviewCard.tsx` | Server | Single review: avatar initial, username, stars, comment, date; indented seller reply if present |

### Seller-side

| Component | Type | Purpose |
|-----------|------|---------|
| `components/seller/ReviewsList.tsx` | Server | Lists all shop reviews with product context |
| `components/seller/ReplyForm.tsx` | Client | Inline textarea + submit button; `useTransition`; hidden once reply exists |

---

## Existing Files Touched

| File | Change |
|------|--------|
| `app/(shop)/product/[slug]/page.tsx` | Add `<ReviewsSection productId={product.id} />` below description block |
| `lib/seller/queries.ts` | Add `getShopReviews()` |
| `lib/seller/actions.ts` | Add `replyToReview()` |
| `app/(seller)/seller/(portal)/layout.tsx` | Add "Reviews" nav item to seller sidebar |

---

## UI Specification

### My Purchases page (`/account/orders`)

- Lists all orders newest first; each order is a card with order date, status badge, and item list.
- Per item: product image thumbnail, product name, quantity.
- **Rate button** (small, orange outline): shown when `order.status === 'DELIVERED'` and `productId` not in `reviewedProductIds`.
- **Reviewed badge** (grey, static): shown when the product already has a review from this buyer.
- Clicking "Rate" opens `ReviewModal` with the productId and orderId pre-filled.

### Review Modal

- Header: "Rate this product"
- Product name displayed for context
- `StarPicker`: 5 stars in a row; clicking a star fills that star and all to the left in orange
- Label beneath stars: "Terrible / Fair / Good / Very Good / Excellent" updates per selection
- Textarea: "Share your experience (optional)", max 500 chars
- Submit button: disabled until a star is selected; shows spinner during `useTransition`
- On success: modal closes; server action calls `revalidatePath('/account/orders')` so the "Rate" button becomes "Reviewed" badge on next render (no optimistic UI needed)

### Product Page Reviews Section

- Appears below the description.
- **Rating summary row**: large rating number (e.g., "4.5"), filled stars display, total review count.
- **Breakdown bars**: 5 rows (5★ → 1★), each with a thin orange progress bar and count label on the right.
- **Review list**: cards in order (newest first). Each card shows:
  - Avatar circle with buyer's name initial
  - Buyer first name (last name hidden for privacy)
  - Star row (filled orange)
  - Comment text
  - Date (formatted "Jun 30, 2026")
  - If `ReviewReply` exists: indented grey block with "Shop's response:" prefix and reply text
- Pagination: "Show more" button loads next page (or simple numbered pagination — implementation choice).
- If no reviews yet: "No reviews yet. Be the first to review this product."

### Seller Reviews Page (`/seller/reviews`)

- Page title: "Product Reviews"
- Lists all reviews across all shop products, newest first.
- Each card: product thumbnail + name (top), then buyer name + star row + comment + date.
- If no reply: `ReplyForm` inline below the review (textarea + "Reply" button).
- If replied: grey "Replied" badge + reply text shown; no form rendered.
- Empty state: "No reviews yet."

---

## Rating Recalculation

On `submitReview`, within the same Prisma transaction:

```ts
const agg = await tx.review.aggregate({
  where: { productId },
  _avg: { rating: true },
  _count: { select: { id: true } },
})
await tx.product.update({
  where: { id: productId },
  data: {
    rating: agg._avg.rating ?? 0,
    reviewCount: agg._count.id,
  },
})
```

This keeps `Product.rating` and `Product.reviewCount` always consistent with actual review data.

---

## Out of Scope (Phase 8)

- Review image uploads
- Review editing or deletion
- Seller reply editing or deletion
- Review helpfulness voting ("Was this helpful?")
- Review sorting/filtering on product page
- Admin review moderation
