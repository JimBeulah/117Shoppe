# 11/7 Eshopee — Phase 1: Core Foundation Design

**Date:** 2026-06-25  
**Phase:** 1 of 10  
**Status:** Approved

---

## Overview

11/7 Eshopee is a full-featured e-commerce marketplace cloning Shopee's feature set, built on Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + Prisma + PostgreSQL. This document covers Phase 1: the core foundation — branding, design system, database schema, component library, and homepage.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 (App Router) |
| UI Library | React 19.2.4 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| ORM | Prisma |
| Database | PostgreSQL (local for dev, Railway for prod) |
| Language | TypeScript 5 |
| Deployment | Railway |

---

## Brand Identity

- **Name:** 11/7 Eshopee
- **Tagline:** (TBD in marketing phase)
- **Logo:** Text-based wordmark "11/7 Eshopee" in white on purple navbar (custom logo asset to be added)

---

## Color Palette

All tokens defined as CSS custom properties in `app/globals.css`.

### Primary — Brand Purple
| Token | Hex | Usage |
|---|---|---|
| `--color-brand-700` | `#6D28D9` | Navbar background, primary buttons |
| `--color-brand-600` | `#7C3AED` | Links, active states |
| `--color-brand-400` | `#A78BFA` | Hover states, icons |
| `--color-brand-100` | `#EDE9FE` | Section backgrounds, tag fills |
| `--color-brand-50` | `#F5F3FF` | Page-level background tint |

### Accent — Flash Sale / Urgency
| Token | Hex | Usage |
|---|---|---|
| `--color-accent-hot` | `#EC4899` | Flash sale banners, countdown, badges |
| `--color-accent-sale` | `#EF4444` | Discount % badges, strikethrough prices |

### Reward
| Token | Hex | Usage |
|---|---|---|
| `--color-reward` | `#F59E0B` | Coins, vouchers, free shipping badges |

### Semantic
| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#10B981` | Order confirmed, in-stock |
| `--color-warning` | `#F59E0B` | Low stock |
| `--color-danger` | `#EF4444` | Out of stock, errors |

### Neutral
| Token | Hex | Usage |
|---|---|---|
| `--color-bg-page` | `#F5F5F5` | Page background |
| `--color-bg-card` | `#FFFFFF` | Product cards, modals |
| `--color-border` | `#E5E7EB` | Card borders, dividers |
| `--color-text-primary` | `#111827` | Headings, prices |
| `--color-text-secondary` | `#6B7280` | Descriptions, labels |

---

## Database Schema (Prisma + PostgreSQL)

All models are created in the initial migration. Phase 1 seeds: `User`, `Shop`, `Category`, `Product`, `ProductVariant`, `Banner`, `Voucher`.

### Phase 1 — Seeded Now

```prisma
model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(BUYER)
  avatar       String?
  coins        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  shop         Shop?
  orders       Order[]
  cart         Cart?
  addresses    Address[]
  reviews      Review[]
  wishlist     Wishlist[]
  notifications Notification[]
  sentMessages     Message[] @relation("SentMessages")
  receivedMessages Message[] @relation("ReceivedMessages")
  searchHistory SearchHistory[]
  coinLogs      Coin[]
  shopFollows   ShopFollow[]
}

enum Role {
  BUYER
  SELLER
  ADMIN
}

model Shop {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  logo           String?
  banner         String?
  rating         Float    @default(0)
  followersCount Int      @default(0)
  ownerId        String   @unique
  owner          User     @relation(fields: [ownerId], references: [id])
  products       Product[]
  orders         Order[]
  reviews        ReviewReply[]
  conversations  Conversation[]
  followers      ShopFollow[]
  createdAt      DateTime @default(now())
}

model Category {
  id       String     @id @default(cuid())
  name     String
  slug     String     @unique
  icon     String?
  parentId String?
  parent   Category?  @relation("SubCategories", fields: [parentId], references: [id])
  children Category[] @relation("SubCategories")
  products Product[]
}

model Product {
  id             String    @id @default(cuid())
  name           String
  slug           String    @unique
  description    String
  price          Float
  originalPrice  Float?
  stock          Int       @default(0)
  sold           Int       @default(0)
  images         String[]
  categoryId     String
  category       Category  @relation(fields: [categoryId], references: [id])
  shopId         String
  shop           Shop      @relation(fields: [shopId], references: [id])
  rating         Float     @default(0)
  reviewCount    Int       @default(0)
  isFlashSale    Boolean   @default(false)
  flashSalePrice Float?
  flashSaleEndsAt DateTime?
  isTrending     Boolean   @default(false)
  isActive       Boolean   @default(true)
  variants       ProductVariant[]
  cartItems      CartItem[]
  orderItems     OrderItem[]
  reviews        Review[]
  wishlist       Wishlist[]
  flashSaleItems FlashSaleItem[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model ProductVariant {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  name      String
  price     Float
  stock     Int
  sku       String?
  image     String?
  cartItems CartItem[]
  orderItems OrderItem[]
}

model Banner {
  id           String   @id @default(cuid())
  imageUrl     String
  linkUrl      String?
  title        String?
  isActive     Boolean  @default(true)
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())
}

model Voucher {
  id            String        @id @default(cuid())
  code          String        @unique
  title         String
  discountType  DiscountType
  discountValue Float
  minSpend      Float         @default(0)
  maxDiscount   Float?
  expiresAt     DateTime
  isActive      Boolean       @default(true)
  usageLimit    Int?
  orders        Order[]
  createdAt     DateTime      @default(now())
}

enum DiscountType {
  PERCENT
  FIXED
}
```

### Phase 2–3 — Schema Created Now, Seeded Later

```prisma
model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id])
  items     CartItem[]
  createdAt DateTime   @default(now())
}

model CartItem {
  id        String          @id @default(cuid())
  cartId    String
  cart      Cart            @relation(fields: [cartId], references: [id])
  productId String
  product   Product         @relation(fields: [productId], references: [id])
  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  quantity  Int
}

model Order {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  shopId        String
  shop          Shop        @relation(fields: [shopId], references: [id])
  status        OrderStatus @default(PENDING)
  total         Float
  shippingFee   Float       @default(0)
  paymentMethod String?
  addressId     String
  address       Address     @relation(fields: [addressId], references: [id])
  voucherId     String?
  voucher       Voucher?    @relation(fields: [voucherId], references: [id])
  items         OrderItem[]
  payment       Payment?
  shipment      Shipment?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model OrderItem {
  id        String          @id @default(cuid())
  orderId   String
  order     Order           @relation(fields: [orderId], references: [id])
  productId String
  product   Product         @relation(fields: [productId], references: [id])
  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  quantity  Int
  price     Float
}

model Address {
  id         String  @id @default(cuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id])
  fullName   String
  phone      String
  street     String
  city       String
  province   String
  postalCode String
  isDefault  Boolean @default(false)
  orders     Order[]
}

model Payment {
  id        String        @id @default(cuid())
  orderId   String        @unique
  order     Order         @relation(fields: [orderId], references: [id])
  method    String
  status    PaymentStatus @default(PENDING)
  amount    Float
  reference String?
  paidAt    DateTime?
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

model Shipment {
  id                String   @id @default(cuid())
  orderId           String   @unique
  order             Order    @relation(fields: [orderId], references: [id])
  courier           String?
  trackingNumber    String?
  status            String?
  estimatedDelivery DateTime?
}
```

### Phase 4+ — Schema Created Now, Used Later

```prisma
model Review {
  id        String        @id @default(cuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  productId String
  product   Product       @relation(fields: [productId], references: [id])
  orderId   String?
  rating    Int
  comment   String?
  images    String[]
  reply     ReviewReply?
  createdAt DateTime      @default(now())
}

model ReviewReply {
  id       String  @id @default(cuid())
  reviewId String  @unique
  review   Review  @relation(fields: [reviewId], references: [id])
  shopId   String
  shop     Shop    @relation(fields: [shopId], references: [id])
  comment  String
}

model Wishlist {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, productId])
}

model FlashSale {
  id       String          @id @default(cuid())
  title    String
  startsAt DateTime
  endsAt   DateTime
  isActive Boolean         @default(true)
  items    FlashSaleItem[]
}

model FlashSaleItem {
  id          String    @id @default(cuid())
  flashSaleId String
  flashSale   FlashSale @relation(fields: [flashSaleId], references: [id])
  productId   String
  product     Product   @relation(fields: [productId], references: [id])
  salePrice   Float
  stock       Int
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String
  title     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Message {
  id           String       @id @default(cuid())
  senderId     String
  sender       User         @relation("SentMessages", fields: [senderId], references: [id])
  receiverId   String
  receiver     User         @relation("ReceivedMessages", fields: [receiverId], references: [id])
  conversationId String
  conversation Conversation @relation(fields: [conversationId], references: [id])
  content      String
  isRead       Boolean      @default(false)
  createdAt    DateTime     @default(now())
}

model Conversation {
  id            String    @id @default(cuid())
  buyerId       String
  shopId        String
  shop          Shop      @relation(fields: [shopId], references: [id])
  messages      Message[]
  lastMessageAt DateTime  @default(now())

  @@unique([buyerId, shopId])
}

model ShopFollow {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, shopId])
}

model SearchHistory {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  query     String
  createdAt DateTime @default(now())
}

model Coin {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  amount      Int
  type        CoinType
  description String?
  createdAt   DateTime @default(now())
}

enum CoinType {
  EARNED
  SPENT
}
```

---

## Homepage Layout

```
┌─────────────────────────────────────────────┐
│  NAVBAR                                     │
│  Logo | Search Bar | Cart | Login/Register  │
├─────────────────────────────────────────────┤
│  CATEGORY BAR (scrollable row)              │
│  📱Electronics  👗Fashion  🏠Home  🎮Games… │
├─────────────────────────────────────────────┤
│  HERO CAROUSEL                              │
│  Auto-sliding banner images (3-5 slides)    │
├──────────────────┬──────────────────────────┤
│  VOUCHER PANEL   │  DAILY DISCOVER PANEL    │
│  Claim vouchers  │  Personalized picks      │
├──────────────────┴──────────────────────────┤
│  FLASH SALE SECTION                         │
│  🔥 Ends in: 02:45:10  [View All]           │
│  [ProductCard] [ProductCard] [ProductCard]… │
├─────────────────────────────────────────────┤
│  PROMO BANNERS ROW (3 small banners)        │
├─────────────────────────────────────────────┤
│  TRENDING / RECOMMENDED PRODUCTS            │
│  [Grid of 20+ ProductCards]                 │
├─────────────────────────────────────────────┤
│  FOOTER                                     │
│  Links | Social | App Download | Copyright  │
└─────────────────────────────────────────────┘
```

---

## Component Library

| Component | Type | Purpose |
|---|---|---|
| `<Navbar />` | Client | Logo, search, cart icon, login/register buttons (UI only in Phase 1) |
| `<CategoryBar />` | Server | Horizontally scrollable category icons from DB |
| `<Footer />` | Server | Static links, social icons, copyright |
| `<HeroCarousel />` | Client | Auto-sliding banners from `Banner` table |
| `<VoucherPanel />` | Server | Voucher cards from `Voucher` table |
| `<DailyDiscoverPanel />` | Server | Placeholder / random product picks |
| `<FlashSaleSection />` | Client | Countdown + horizontal scroll of flash sale products |
| `<CountdownTimer />` | Client | Live countdown to `flashSaleEndsAt` |
| `<PromoBannersRow />` | Server | 3 static promo banner images |
| `<TrendingProductsGrid />` | Server | Grid of `isTrending: true` products |
| `<ProductCard />` | Server | Reusable card: image, name, price, discount badge, rating, sold count |
| `<CategoryIcon />` | Server | Icon + label for category bar |
| `<SectionHeader />` | Server | Section title + "View All" link with brand underline |
| `<VoucherCard />` | Client | Voucher display + claim button (UI only Phase 1) |
| `<Badge />` | Server | sale %, "HOT", "Free Shipping" label variants |
| `<CountdownTimer />` | Client | Ticking HH:MM:SS display |

---

## File Structure

```
app/
  (shop)/
    layout.tsx          ← Navbar + Footer wrapper
    page.tsx            ← Homepage server component
    loading.tsx         ← Homepage skeleton
  (auth)/
    layout.tsx          ← Auth-only layout (no navbar)
  (seller)/
    layout.tsx          ← Seller dashboard layout
  globals.css           ← CSS design tokens
  layout.tsx            ← Root layout (html, body, fonts)
  not-found.tsx
  error.tsx

components/
  layout/
    Navbar.tsx
    Footer.tsx
    CategoryBar.tsx
  home/
    HeroCarousel.tsx
    VoucherPanel.tsx
    DailyDiscoverPanel.tsx
    FlashSaleSection.tsx
    PromoBannersRow.tsx
    TrendingProductsGrid.tsx
  ui/
    ProductCard.tsx
    CategoryIcon.tsx
    SectionHeader.tsx
    VoucherCard.tsx
    CountdownTimer.tsx
    Badge.tsx

lib/
  db.ts               ← Prisma client singleton
  utils.ts            ← cn(), formatPrice(), formatSold()

prisma/
  schema.prisma
  seed.ts

types/
  index.ts            ← Shared TypeScript interfaces

.env.local            ← DATABASE_URL=postgresql://...
```

---

## Seed Data Plan

`prisma/seed.ts` creates:

- **1 admin user** + **5 seller users**
- **5 shops** (one per seller)
- **12 categories** (Electronics, Fashion, Home & Living, Sports, Beauty, Toys, Food, Books, Automotive, Pets, Health, Vouchers)
- **50 products** spread across categories, with variants, some `isFlashSale: true`, some `isTrending: true`
- **5 banners** (hero carousel slides)
- **6 vouchers** (mix of percent and fixed discounts)

---

## Rendering Strategy

| Component | Strategy | Reason |
|---|---|---|
| Homepage `page.tsx` | Server Component | Fetches all data at request time |
| `HeroCarousel` | Client Component | Needs auto-slide interval |
| `CountdownTimer` | Client Component | Needs live ticking |
| `Navbar` | Client Component | Needs search input state, cart count |
| All others | Server Components | No interactivity needed |

---

## Environment Variables

```env
# .env.local
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/eshopee"
```

---

## Out of Scope for Phase 1

The following are explicitly deferred to later phases:
- User authentication (Phase 3)
- Cart functionality (Phase 4)
- Search functionality (Phase 7)
- Seller dashboard (Phase 6)
- Payment processing (Phase 5)
- Reviews (Phase 8)
- Flash sale admin management (Phase 9)
- Chat (Phase 10)

---

## Next Phase

**Phase 2 — Product Catalog:** Category pages, product detail pages, product listing with filters and sorting.
