# 11/7 Shoppe — Feature Roadmap

Gap analysis against Shopee's feature set, derived from the current schema
(`prisma/schema.prisma`), routes under `app/`, and server actions in `lib/`.

Last reviewed: 2026-08-27

---

## Already shipped

Catalog with variants and flash sales, cart, multi-shop checkout split, COD +
PayMongo, vouchers, returns/refunds with seller→admin escalation, commissions
and payouts, inventory with stock reservations and movement history, buyer↔seller
chat over socket.io, reviews with media/votes/replies, notifications with
per-type preferences, shop staff RBAC, audit logs, admin/seller reports, and
wishlist (heart on cards/PDP, `/account/wishlist`, header count, price-drop
notifications).

This covers most of the marketplace spine. What follows is what's missing.

---

## Tier 1 — Models exist, feature does not

Fastest wins: the schema is already in place, only the product layer is absent.

### 1.1 Shopee Coins
- **State:** `Coin` model at `prisma/schema.prisma:799` with `EARNED`/`SPENT`.
  Only mention in the app is marketing copy in `components/home/PromoBannersRow.tsx`.
- **Missing:** earn-on-order-completion accrual, redeem-at-checkout (needs a
  coin line on the order total), balance + ledger page under `/account`,
  expiry policy.

---

## Tier 2 — Core buyer mechanics

### 2.1 Cart item selection
- **State:** `placeOrder` (`app/(shop)/checkout/actions.ts:73`) checks out the
  entire cart and hard-errors if any single item is out of stock or belongs to a
  shop on vacation.
- **Missing:** per-item and per-shop checkboxes, selection persisted on the cart,
  checkout scoped to the selection, summary totals reflecting only selected items.
- **Why it matters:** one bad item currently blocks the whole cart.

### 2.2 Voucher system depth
- **State:** single voucher slot per order. `lib/data/voucher.ts:48` counts
  orders globally against `usageLimit`.
- **Missing:**
  - Per-user usage cap (today one buyer can drain a whole voucher).
  - Stacking: one platform voucher + one shop voucher on the same order.
  - Free-shipping voucher type — `DiscountType` is only `PERCENT`/`FIXED` and
    discounts never apply to `shippingFee`.
  - Claim/wallet flow: a "My Vouchers" page and claimable vouchers.
    `VoucherPanel` currently only displays codes.
  - Suggested: a `VoucherRedemption` model (userId, voucherId, orderId) to make
    per-user limits and the wallet possible.

### 2.3 Recommendations and discovery
- **State:** no references to related / similar / recently-viewed anywhere in
  `app`, `components`, or `lib/data`.
- **Missing:** "Similar Products" and "More From This Shop" on the PDP,
  cross-sell in the cart, a recently-viewed rail.
- **Note:** `AnalyticsEvent` already records product views — the input data
  exists and is unused.

### 2.4 Product Q&A
- **State:** no model, no UI.
- **Missing:** buyer questions on the PDP, seller answers, notification on answer.
  Second-biggest PDP conversion surface after reviews.

### 2.5 Tiered variations
- **State:** `ProductVariant.name` is a single string plus a loose
  `variantOptions Json` on `Product`.
- **Missing:** a real two-axis option matrix (e.g. colour × size) with per-combination
  stock, price, SKU, and image. Sellers hit this limit immediately.

---

## Tier 3 — Growth and engagement layer

None of these exist today. Ordered roughly by revenue impact.

- **Promoted listings / seller ads** — the main non-commission revenue stream.
- **Affiliate program** — referral links, attribution, commission payout.
- **Bundle deals / add-on deals / buy-more-save-more** wholesale price tiers.
- **Free-shipping-min-spend program** (platform-funded, distinct from vouchers).
- **Live selling** and a short-video product feed.
- **Daily check-in and games** feeding the Coins system in Tier 1.1.

---

## Tier 4 — Operational gaps

### 4.1 Notifications are in-app only
No mail/SMS/push provider in `package.json`. A buyer who closes the tab never
learns their order shipped. Needs a transactional email provider wired into
`lib/notifications/create.ts`, honouring the existing `NotificationPreference`.

### 4.2 Shipping is manual
`Shipment` (`prisma/schema.prisma:583`) stores `courier` and `trackingNumber` as
free text. No carrier API, no tracking webhooks, no printable waybill for sellers.

### 4.3 No SEO surface
No `app/sitemap.ts`, no `app/robots.ts`. For a product marketplace this is a
large amount of free organic traffic left on the table. Product, category, and
shop pages should all be enumerated.

### 4.4 Search is thin
Trigram index on product name only. Filters in `components/catalog/FilterSidebar.tsx`
are price/rating/category — no brand, location, or shipping facets, no typo
tolerance, no synonyms.

### 4.5 No abuse controls
No rate limiting on review or chat writes, no content moderation, no seller
penalty/strike system, no buyer return-abuse tracking.

### 4.6 Seller bulk operations
No CSV product import/export, no bulk price or stock editing. A seller with 200
SKUs cannot realistically onboard.

---

## Suggested sequence

1. **Cart item selection** — unblocks checkout for carts with any bad item.
2. **Voucher depth** — per-user limits, shipping vouchers, claim wallet.
3. **Related products** — reuses `AnalyticsEvent` data already being collected.
4. **Email notifications** — the largest operational hole.
5. **Sitemap + robots** — cheap, compounding organic traffic.

Items 1–3 are contained work against models that already exist. Items 4–5 are
launch blockers for a real marketplace.
