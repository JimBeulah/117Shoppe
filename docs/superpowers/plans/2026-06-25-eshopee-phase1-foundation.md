# 11/7 Eshopee Phase 1 — Core Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete foundation for 11/7 Eshopee — brand design system, full Prisma schema, seeded database, reusable component library, and a fully rendered Shopee-like homepage pulling real data from PostgreSQL.

**Architecture:** Next.js 16 App Router with route groups `(shop)`, `(auth)`, `(seller)` for layout isolation. Server Components fetch from PostgreSQL via Prisma by default; only interactive components (carousel, countdown, navbar) are Client Components. All design tokens live as CSS custom properties in `globals.css` under Tailwind v4's `@theme inline` block.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, TypeScript 5, Tailwind CSS v4, shadcn/ui, Prisma 6, PostgreSQL (local), Vitest

## Global Constraints

- Next.js 16 App Router only — no Pages Router. Read `node_modules/next/dist/docs/` before writing any route code.
- Tailwind v4 CSS-first config — no `tailwind.config.js`. All theme tokens go inside `@theme inline {}` in `app/globals.css`.
- shadcn/ui already installed at `shadcn` package — import from `@/components/ui/` (shadcn init already ran).
- All Prisma queries run inside Server Components or Server Actions — never import `prisma` in a `"use client"` file.
- `"use client"` directive only where DOM APIs or React state/effects are required.
- Path alias `@/` maps to project root (`d:/JIM_BEULAH/Code/eshopee/`).
- PostgreSQL must be running locally. `DATABASE_URL` must be set in `.env.local`.
- Brand name: **11/7 Eshopee** (exact casing).
- Primary brand color: `#7C3AED` (purple-600). Navbar background: `#6D28D9` (purple-700).

---

## File Map

```
.env.local                                   ← DATABASE_URL
prisma/
  schema.prisma                              ← Full schema (all phases)
  seed.ts                                    ← Seed: users, shops, categories, products, banners, vouchers
lib/
  db.ts                                      ← Prisma client singleton
  utils.ts                                   ← cn(), formatPrice(), formatSold(), calcDiscount()
types/
  index.ts                                   ← Shared TypeScript interfaces (ProductWithRelations, etc.)
app/
  globals.css                                ← Brand tokens injected into @theme inline + :root
  layout.tsx                                 ← Root layout: html, body, Geist font, metadata
  not-found.tsx                              ← Global 404
  error.tsx                                  ← Global error boundary
  (shop)/
    layout.tsx                               ← Navbar + main + Footer wrapper
    page.tsx                                 ← Homepage: fetches all data, composes sections
    loading.tsx                              ← Homepage skeleton
  (auth)/
    layout.tsx                               ← Auth-only layout (no navbar/footer)
  (seller)/
    layout.tsx                               ← Seller dashboard layout
components/
  layout/
    Navbar.tsx                               ← "use client" — logo, search input, cart, login buttons
    Footer.tsx                               ← Server — links, social, copyright
    CategoryBar.tsx                          ← Server — scrollable category icons row
  home/
    HeroCarousel.tsx                         ← "use client" — auto-sliding banner carousel
    VoucherPanel.tsx                         ← Server — voucher cards grid
    DailyDiscoverPanel.tsx                   ← Server — random product picks panel
    FlashSaleSection.tsx                     ← "use client" — countdown + horizontal product scroll
    PromoBannersRow.tsx                      ← Server — 3-column promo banners
    TrendingProductsGrid.tsx                 ← Server — masonry-style product grid
  ui/
    Badge.tsx                                ← Variants: sale, hot, free-shipping, new
    SectionHeader.tsx                        ← Brand underline title + "View All" link
    ProductCard.tsx                          ← Server — image, name, price, discount, rating, sold
    CategoryIcon.tsx                         ← Server — icon image + label
    VoucherCard.tsx                          ← Server — voucher display card
    CountdownTimer.tsx                       ← "use client" — ticking HH:MM:SS display
tests/
  lib/
    utils.test.ts                            ← Unit tests for formatPrice, formatSold, calcDiscount
```

---

### Task 1: Prisma Setup, Schema, and Migration

**Files:**
- Create: `.env.local`
- Create: `prisma/schema.prisma`
- Modify: `package.json` (add prisma seed script)

**Interfaces:**
- Produces: All Prisma model types available via `@prisma/client` after migration

- [ ] **Step 1: Install Prisma**

```bash
npm install prisma @prisma/client
```

Expected output: `added N packages`

- [ ] **Step 2: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and `.env`. Move the `DATABASE_URL` to `.env.local` instead:

- [ ] **Step 3: Create `.env.local`**

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/eshopee"
```

Replace `YOUR_PASSWORD` with your local PostgreSQL password. Delete the `.env` file Prisma created (it's redundant and should not be committed).

- [ ] **Step 4: Create PostgreSQL database**

```bash
psql -U postgres -c "CREATE DATABASE eshopee;"
```

Expected: `CREATE DATABASE`

- [ ] **Step 5: Write the full schema**

Replace the entire contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum Role {
  BUYER
  SELLER
  ADMIN
}

enum DiscountType {
  PERCENT
  FIXED
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum CoinType {
  EARNED
  SPENT
}

// ─── Phase 1 Models (seeded) ─────────────────────────────────────────────────

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

  shop             Shop?
  orders           Order[]
  cart             Cart?
  addresses        Address[]
  reviews          Review[]
  wishlist         Wishlist[]
  notifications    Notification[]
  sentMessages     Message[]      @relation("SentMessages")
  receivedMessages Message[]      @relation("ReceivedMessages")
  searchHistory    SearchHistory[]
  coinLogs         Coin[]
  shopFollows      ShopFollow[]
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
  createdAt      DateTime @default(now())

  owner         User           @relation(fields: [ownerId], references: [id])
  products      Product[]
  orders        Order[]
  reviewReplies ReviewReply[]
  conversations Conversation[]
  followers     ShopFollow[]
}

model Category {
  id       String  @id @default(cuid())
  name     String
  slug     String  @unique
  icon     String?
  parentId String?

  parent   Category?  @relation("SubCategories", fields: [parentId], references: [id])
  children Category[] @relation("SubCategories")
  products Product[]
}

model Product {
  id              String    @id @default(cuid())
  name            String
  slug            String    @unique
  description     String
  price           Float
  originalPrice   Float?
  stock           Int       @default(0)
  sold            Int       @default(0)
  images          String[]
  rating          Float     @default(0)
  reviewCount     Int       @default(0)
  isFlashSale     Boolean   @default(false)
  flashSalePrice  Float?
  flashSaleEndsAt DateTime?
  isTrending      Boolean   @default(false)
  isActive        Boolean   @default(true)
  categoryId      String
  shopId          String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  category       Category        @relation(fields: [categoryId], references: [id])
  shop           Shop            @relation(fields: [shopId], references: [id])
  variants       ProductVariant[]
  cartItems      CartItem[]
  orderItems     OrderItem[]
  reviews        Review[]
  wishlist       Wishlist[]
  flashSaleItems FlashSaleItem[]
}

model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  name      String
  price     Float
  stock     Int
  sku       String?
  image     String?

  product    Product    @relation(fields: [productId], references: [id])
  cartItems  CartItem[]
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
  id            String       @id @default(cuid())
  code          String       @unique
  title         String
  discountType  DiscountType
  discountValue Float
  minSpend      Float        @default(0)
  maxDiscount   Float?
  expiresAt     DateTime
  isActive      Boolean      @default(true)
  usageLimit    Int?
  createdAt     DateTime     @default(now())

  orders Order[]
}

// ─── Phase 2–3 Models ────────────────────────────────────────────────────────

model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  createdAt DateTime   @default(now())

  user  User       @relation(fields: [userId], references: [id])
  items CartItem[]
}

model CartItem {
  id        String  @id @default(cuid())
  cartId    String
  productId String
  variantId String?
  quantity  Int

  cart    Cart            @relation(fields: [cartId], references: [id])
  product Product         @relation(fields: [productId], references: [id])
  variant ProductVariant? @relation(fields: [variantId], references: [id])
}

model Order {
  id            String      @id @default(cuid())
  userId        String
  shopId        String
  status        OrderStatus @default(PENDING)
  total         Float
  shippingFee   Float       @default(0)
  paymentMethod String?
  addressId     String
  voucherId     String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  user     User        @relation(fields: [userId], references: [id])
  shop     Shop        @relation(fields: [shopId], references: [id])
  address  Address     @relation(fields: [addressId], references: [id])
  voucher  Voucher?    @relation(fields: [voucherId], references: [id])
  items    OrderItem[]
  payment  Payment?
  shipment Shipment?
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  variantId String?
  quantity  Int
  price     Float

  order   Order           @relation(fields: [orderId], references: [id])
  product Product         @relation(fields: [productId], references: [id])
  variant ProductVariant? @relation(fields: [variantId], references: [id])
}

model Address {
  id         String  @id @default(cuid())
  userId     String
  fullName   String
  phone      String
  street     String
  city       String
  province   String
  postalCode String
  isDefault  Boolean @default(false)

  user   User    @relation(fields: [userId], references: [id])
  orders Order[]
}

model Payment {
  id        String        @id @default(cuid())
  orderId   String        @unique
  method    String
  status    PaymentStatus @default(PENDING)
  amount    Float
  reference String?
  paidAt    DateTime?

  order Order @relation(fields: [orderId], references: [id])
}

model Shipment {
  id                String    @id @default(cuid())
  orderId           String    @unique
  courier           String?
  trackingNumber    String?
  status            String?
  estimatedDelivery DateTime?

  order Order @relation(fields: [orderId], references: [id])
}

// ─── Phase 4+ Models ─────────────────────────────────────────────────────────

model Review {
  id        String   @id @default(cuid())
  userId    String
  productId String
  orderId   String?
  rating    Int
  comment   String?
  images    String[]
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

model Wishlist {
  id        String   @id @default(cuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
}

model FlashSale {
  id       String          @id @default(cuid())
  title    String
  startsAt DateTime
  endsAt   DateTime
  isActive Boolean         @default(true)

  items FlashSaleItem[]
}

model FlashSaleItem {
  id          String @id @default(cuid())
  flashSaleId String
  productId   String
  salePrice   Float
  stock       Int

  flashSale FlashSale @relation(fields: [flashSaleId], references: [id])
  product   Product   @relation(fields: [productId], references: [id])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model Message {
  id             String   @id @default(cuid())
  senderId       String
  receiverId     String
  conversationId String
  content        String
  isRead         Boolean  @default(false)
  createdAt      DateTime @default(now())

  sender       User         @relation("SentMessages", fields: [senderId], references: [id])
  receiver     User         @relation("ReceivedMessages", fields: [receiverId], references: [id])
  conversation Conversation @relation(fields: [conversationId], references: [id])
}

model Conversation {
  id            String   @id @default(cuid())
  buyerId       String
  shopId        String
  lastMessageAt DateTime @default(now())

  shop     Shop      @relation(fields: [shopId], references: [id])
  messages Message[]

  @@unique([buyerId, shopId])
}

model ShopFollow {
  id        String   @id @default(cuid())
  userId    String
  shopId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  shop Shop @relation(fields: [shopId], references: [id])

  @@unique([userId, shopId])
}

model SearchHistory {
  id        String   @id @default(cuid())
  userId    String
  query     String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model Coin {
  id          String   @id @default(cuid())
  userId      String
  amount      Int
  type        CoinType
  description String?
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 6: Validate the schema**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 7: Run the migration**

```bash
npx prisma migrate dev --name init
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 8: Add seed script to `package.json`**

Add to `package.json` under the `"scripts"` key — also add the prisma seed config:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:seed": "npx prisma db seed"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 9: Install tsx (needed to run TypeScript seed file)**

```bash
npm install -D tsx
```

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "feat: add full prisma schema and initial migration"
```

---

### Task 2: Seed Data

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: All Prisma models from Task 1
- Produces: Populated DB rows used by every homepage section

- [ ] **Step 1: Create `prisma/seed.ts`**

```typescript
import { PrismaClient, Role, DiscountType } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hash(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

const flashSaleEnd = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now

async function main() {
  console.log('Seeding database...')

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'electronics' }, update: {}, create: { name: 'Electronics', slug: 'electronics', icon: '📱' } }),
    prisma.category.upsert({ where: { slug: 'fashion' }, update: {}, create: { name: 'Fashion', slug: 'fashion', icon: '👗' } }),
    prisma.category.upsert({ where: { slug: 'home-living' }, update: {}, create: { name: 'Home & Living', slug: 'home-living', icon: '🏠' } }),
    prisma.category.upsert({ where: { slug: 'sports' }, update: {}, create: { name: 'Sports', slug: 'sports', icon: '⚽' } }),
    prisma.category.upsert({ where: { slug: 'beauty' }, update: {}, create: { name: 'Beauty', slug: 'beauty', icon: '💄' } }),
    prisma.category.upsert({ where: { slug: 'toys' }, update: {}, create: { name: 'Toys', slug: 'toys', icon: '🧸' } }),
    prisma.category.upsert({ where: { slug: 'food' }, update: {}, create: { name: 'Food & Drinks', slug: 'food', icon: '🍜' } }),
    prisma.category.upsert({ where: { slug: 'books' }, update: {}, create: { name: 'Books', slug: 'books', icon: '📚' } }),
    prisma.category.upsert({ where: { slug: 'automotive' }, update: {}, create: { name: 'Automotive', slug: 'automotive', icon: '🚗' } }),
    prisma.category.upsert({ where: { slug: 'pets' }, update: {}, create: { name: 'Pets', slug: 'pets', icon: '🐾' } }),
    prisma.category.upsert({ where: { slug: 'health' }, update: {}, create: { name: 'Health', slug: 'health', icon: '💊' } }),
    prisma.category.upsert({ where: { slug: 'vouchers' }, update: {}, create: { name: 'Vouchers', slug: 'vouchers', icon: '🎟️' } }),
  ])

  const [electronics, fashion, homeLiving, sports, beauty, toys, food, books] = categories

  // ── Users + Shops ──────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@eshopee.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@eshopee.com', passwordHash: hash('admin123'), role: Role.ADMIN, coins: 0 },
  })

  const sellers = await Promise.all([
    prisma.user.upsert({ where: { email: 'techpro@seller.com' }, update: {}, create: { name: 'TechPro Store', email: 'techpro@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 500 } }),
    prisma.user.upsert({ where: { email: 'fashionhub@seller.com' }, update: {}, create: { name: 'Fashion Hub', email: 'fashionhub@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 300 } }),
    prisma.user.upsert({ where: { email: 'homedecor@seller.com' }, update: {}, create: { name: 'Home Decor Ph', email: 'homedecor@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 200 } }),
    prisma.user.upsert({ where: { email: 'beautyph@seller.com' }, update: {}, create: { name: 'Beauty PH', email: 'beautyph@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 400 } }),
    prisma.user.upsert({ where: { email: 'sportstop@seller.com' }, update: {}, create: { name: 'Sports Top PH', email: 'sportstop@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 250 } }),
  ])

  const shops = await Promise.all([
    prisma.shop.upsert({ where: { slug: 'techpro-store' }, update: {}, create: { name: 'TechPro Store', slug: 'techpro-store', rating: 4.8, followersCount: 12400, ownerId: sellers[0].id } }),
    prisma.shop.upsert({ where: { slug: 'fashion-hub' }, update: {}, create: { name: 'Fashion Hub PH', slug: 'fashion-hub', rating: 4.7, followersCount: 8900, ownerId: sellers[1].id } }),
    prisma.shop.upsert({ where: { slug: 'home-decor-ph' }, update: {}, create: { name: 'Home Decor PH', slug: 'home-decor-ph', rating: 4.6, followersCount: 5200, ownerId: sellers[2].id } }),
    prisma.shop.upsert({ where: { slug: 'beauty-ph' }, update: {}, create: { name: 'Beauty PH Official', slug: 'beauty-ph', rating: 4.9, followersCount: 21000, ownerId: sellers[3].id } }),
    prisma.shop.upsert({ where: { slug: 'sports-top-ph' }, update: {}, create: { name: 'Sports Top PH', slug: 'sports-top-ph', rating: 4.5, followersCount: 6700, ownerId: sellers[4].id } }),
  ])

  // ── Products ───────────────────────────────────────────────────────────────
  const productData = [
    // Electronics – TechPro Store
    { name: 'Wireless Earbuds Pro X1', slug: 'wireless-earbuds-pro-x1', description: 'Premium wireless earbuds with ANC and 30-hour battery life.', price: 1299, originalPrice: 1999, stock: 500, sold: 3420, images: ['https://placehold.co/400x400/7C3AED/white?text=Earbuds'], categoryId: electronics.id, shopId: shops[0].id, rating: 4.8, reviewCount: 892, isFlashSale: true, flashSalePrice: 999, flashSaleEndsAt: flashSaleEnd, isTrending: true },
    { name: 'Smart Watch Series 7', slug: 'smart-watch-series-7', description: 'Health monitoring smartwatch with AMOLED display.', price: 2499, originalPrice: 3999, stock: 200, sold: 1205, images: ['https://placehold.co/400x400/7C3AED/white?text=Watch'], categoryId: electronics.id, shopId: shops[0].id, rating: 4.7, reviewCount: 534, isFlashSale: true, flashSalePrice: 1999, flashSaleEndsAt: flashSaleEnd, isTrending: true },
    { name: 'USB-C Hub 7-in-1', slug: 'usb-c-hub-7in1', description: 'Multi-port hub: HDMI 4K, 3x USB-A, SD card, PD charging.', price: 799, originalPrice: 1200, stock: 800, sold: 4100, images: ['https://placehold.co/400x400/7C3AED/white?text=USB+Hub'], categoryId: electronics.id, shopId: shops[0].id, rating: 4.6, reviewCount: 1203, isTrending: true },
    { name: 'Mechanical Keyboard TKL', slug: 'mechanical-keyboard-tkl', description: 'Tenkeyless mechanical keyboard with RGB backlight, blue switches.', price: 1899, originalPrice: 2500, stock: 150, sold: 867, images: ['https://placehold.co/400x400/6D28D9/white?text=Keyboard'], categoryId: electronics.id, shopId: shops[0].id, rating: 4.9, reviewCount: 421, isTrending: false },
    { name: 'Portable Power Bank 20000mAh', slug: 'power-bank-20000mah', description: 'Fast-charge 20000mAh power bank, dual USB-C output.', price: 899, originalPrice: 1500, stock: 600, sold: 5600, images: ['https://placehold.co/400x400/6D28D9/white?text=Power+Bank'], categoryId: electronics.id, shopId: shops[0].id, rating: 4.7, reviewCount: 2341, isFlashSale: true, flashSalePrice: 699, flashSaleEndsAt: flashSaleEnd },
    { name: 'Webcam 1080P HD', slug: 'webcam-1080p-hd', description: 'Full HD webcam with built-in mic and auto light correction.', price: 1199, originalPrice: 1800, stock: 300, sold: 1890, images: ['https://placehold.co/400x400/A78BFA/white?text=Webcam'], categoryId: electronics.id, shopId: shops[0].id, rating: 4.5, reviewCount: 673 },

    // Fashion – Fashion Hub
    { name: 'Oversized Cotton Tee — Black', slug: 'oversized-cotton-tee-black', description: 'Premium 100% cotton oversized fit tee. Unisex.', price: 349, originalPrice: 599, stock: 1000, sold: 8900, images: ['https://placehold.co/400x400/EC4899/white?text=Tee'], categoryId: fashion.id, shopId: shops[1].id, rating: 4.9, reviewCount: 3421, isFlashSale: true, flashSalePrice: 249, flashSaleEndsAt: flashSaleEnd, isTrending: true },
    { name: 'High-Waist Cargo Pants', slug: 'high-waist-cargo-pants', description: 'Y2K style cargo pants with adjustable waist.', price: 799, originalPrice: 1200, stock: 500, sold: 4300, images: ['https://placehold.co/400x400/EC4899/white?text=Cargo'], categoryId: fashion.id, shopId: shops[1].id, rating: 4.7, reviewCount: 1890, isTrending: true },
    { name: 'Linen Button-Down Shirt', slug: 'linen-button-down-shirt', description: 'Breathable linen shirt, perfect for tropical weather.', price: 599, originalPrice: 899, stock: 700, sold: 2100, images: ['https://placehold.co/400x400/EC4899/white?text=Shirt'], categoryId: fashion.id, shopId: shops[1].id, rating: 4.6, reviewCount: 987 },
    { name: 'Chunky Platform Sneakers', slug: 'chunky-platform-sneakers', description: 'Retro chunky sole sneakers, available in 5 colors.', price: 1499, originalPrice: 2200, stock: 300, sold: 1560, images: ['https://placehold.co/400x400/F59E0B/white?text=Sneakers'], categoryId: fashion.id, shopId: shops[1].id, rating: 4.8, reviewCount: 734, isTrending: true },
    { name: 'Crossbody Bag Mini', slug: 'crossbody-bag-mini', description: 'Compact PU leather crossbody bag with chain strap.', price: 649, originalPrice: 999, stock: 400, sold: 3200, images: ['https://placehold.co/400x400/F59E0B/white?text=Bag'], categoryId: fashion.id, shopId: shops[1].id, rating: 4.7, reviewCount: 1243 },

    // Home & Living – Home Decor PH
    { name: 'Rattan Round Mirror 60cm', slug: 'rattan-round-mirror-60cm', description: 'Handwoven rattan frame wall mirror, boho aesthetic.', price: 1299, originalPrice: 1800, stock: 150, sold: 890, images: ['https://placehold.co/400x400/10B981/white?text=Mirror'], categoryId: homeLiving.id, shopId: shops[2].id, rating: 4.9, reviewCount: 456, isTrending: true },
    { name: 'Scented Soy Candle Set', slug: 'scented-soy-candle-set', description: 'Set of 3 handpoured soy candles: Lavender, Vanilla, Sandalwood.', price: 599, originalPrice: 899, stock: 500, sold: 2300, images: ['https://placehold.co/400x400/10B981/white?text=Candles'], categoryId: homeLiving.id, shopId: shops[2].id, rating: 4.8, reviewCount: 1102, isTrending: true },
    { name: 'Ceramic Mug Set of 4', slug: 'ceramic-mug-set-4', description: 'Minimalist matte ceramic mugs, 350ml, microwave safe.', price: 799, originalPrice: 1200, stock: 300, sold: 1780, images: ['https://placehold.co/400x400/10B981/white?text=Mugs'], categoryId: homeLiving.id, shopId: shops[2].id, rating: 4.7, reviewCount: 892, isFlashSale: true, flashSalePrice: 599, flashSaleEndsAt: flashSaleEnd },
    { name: 'String Fairy Lights 10m', slug: 'string-fairy-lights-10m', description: '10-meter USB LED string lights, warm white, dimmable.', price: 299, originalPrice: 499, stock: 1000, sold: 6700, images: ['https://placehold.co/400x400/10B981/white?text=Lights'], categoryId: homeLiving.id, shopId: shops[2].id, rating: 4.6, reviewCount: 3421 },

    // Beauty – Beauty PH
    { name: 'Niacinamide 10% Serum 30ml', slug: 'niacinamide-10-serum-30ml', description: 'Oil-control and pore-minimizing serum with zinc.', price: 449, originalPrice: 699, stock: 800, sold: 9800, images: ['https://placehold.co/400x400/EC4899/white?text=Serum'], categoryId: beauty.id, shopId: shops[3].id, rating: 4.9, reviewCount: 4532, isFlashSale: true, flashSalePrice: 349, flashSaleEndsAt: flashSaleEnd, isTrending: true },
    { name: 'SPF 50 Sunscreen PA++++', slug: 'spf50-sunscreen', description: 'Lightweight no-white-cast sunscreen, water resistant.', price: 599, originalPrice: 899, stock: 600, sold: 7200, images: ['https://placehold.co/400x400/EC4899/white?text=SPF50'], categoryId: beauty.id, shopId: shops[3].id, rating: 4.8, reviewCount: 3210, isTrending: true },
    { name: 'Lip Tint Set 6 Colors', slug: 'lip-tint-set-6-colors', description: 'Long-lasting water tint in 6 shades, transfer-proof.', price: 399, originalPrice: 650, stock: 1200, sold: 5600, images: ['https://placehold.co/400x400/EC4899/white?text=Lip+Tint'], categoryId: beauty.id, shopId: shops[3].id, rating: 4.7, reviewCount: 2890 },

    // Sports – Sports Top PH
    { name: 'Yoga Mat Non-Slip 6mm', slug: 'yoga-mat-non-slip-6mm', description: 'Extra thick 6mm TPE yoga mat, alignment lines, carry strap.', price: 799, originalPrice: 1200, stock: 400, sold: 3200, images: ['https://placehold.co/400x400/10B981/white?text=Yoga+Mat'], categoryId: sports.id, shopId: shops[4].id, rating: 4.8, reviewCount: 1456, isTrending: true },
    { name: 'Resistance Bands Set 5pcs', slug: 'resistance-bands-set-5pcs', description: '5 resistance levels, latex-free, includes door anchor.', price: 499, originalPrice: 799, stock: 600, sold: 4100, images: ['https://placehold.co/400x400/10B981/white?text=Bands'], categoryId: sports.id, shopId: shops[4].id, rating: 4.7, reviewCount: 2103, isFlashSale: true, flashSalePrice: 399, flashSaleEndsAt: flashSaleEnd },
    { name: 'Stainless Steel Water Bottle 1L', slug: 'stainless-steel-water-bottle-1l', description: 'Double-wall insulated, keeps cold 24h, hot 12h.', price: 699, originalPrice: 999, stock: 700, sold: 5800, images: ['https://placehold.co/400x400/10B981/white?text=Bottle'], categoryId: sports.id, shopId: shops[4].id, rating: 4.9, reviewCount: 3201, isTrending: true },
  ]

  for (const p of productData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    })
  }

  // ── Banners ────────────────────────────────────────────────────────────────
  const banners = [
    { imageUrl: 'https://placehold.co/1200x400/6D28D9/white?text=11%2F7+Eshopee+Mega+Sale', title: 'Mega Sale — Up to 70% Off', linkUrl: '/sale', displayOrder: 1 },
    { imageUrl: 'https://placehold.co/1200x400/EC4899/white?text=Flash+Sale+Every+Hour', title: 'Flash Sale Every Hour', linkUrl: '/flash-sale', displayOrder: 2 },
    { imageUrl: 'https://placehold.co/1200x400/7C3AED/white?text=Free+Shipping+All+Orders', title: 'Free Shipping on All Orders', linkUrl: '/free-shipping', displayOrder: 3 },
    { imageUrl: 'https://placehold.co/1200x400/10B981/white?text=New+Arrivals+This+Week', title: 'New Arrivals This Week', linkUrl: '/new', displayOrder: 4 },
    { imageUrl: 'https://placehold.co/1200x400/F59E0B/white?text=Earn+Coins+Every+Purchase', title: 'Earn Eshopee Coins', linkUrl: '/coins', displayOrder: 5 },
  ]

  for (const b of banners) {
    const existing = await prisma.banner.findFirst({ where: { title: b.title } })
    if (!existing) await prisma.banner.create({ data: b })
  }

  // ── Vouchers ───────────────────────────────────────────────────────────────
  const vouchers = [
    { code: 'ESHOPEE50', title: '₱50 Off on ₱500 min spend', discountType: DiscountType.FIXED, discountValue: 50, minSpend: 500, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { code: 'SAVE20', title: '20% Off (max ₱200)', discountType: DiscountType.PERCENT, discountValue: 20, minSpend: 300, maxDiscount: 200, expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { code: 'NEWUSER100', title: '₱100 Off for New Users', discountType: DiscountType.FIXED, discountValue: 100, minSpend: 600, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { code: 'FREESHIP', title: 'Free Shipping Voucher', discountType: DiscountType.FIXED, discountValue: 80, minSpend: 0, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    { code: 'FLASH30', title: '30% Off Flash Items', discountType: DiscountType.PERCENT, discountValue: 30, minSpend: 400, maxDiscount: 300, expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
    { code: 'PURPLE11', title: '₱11 Off — 11/7 Special', discountType: DiscountType.FIXED, discountValue: 11, minSpend: 111, expiresAt: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000) },
  ]

  for (const v of vouchers) {
    await prisma.voucher.upsert({ where: { code: v.code }, update: {}, create: v })
  }

  console.log('✅ Seeding complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the seed**

```bash
npx prisma db seed
```

Expected: `✅ Seeding complete.`

- [ ] **Step 3: Verify seed data in Prisma Studio**

```bash
npx prisma studio
```

Open browser, check: Categories (12 rows), Products (20 rows), Banners (5 rows), Vouchers (6 rows), Shops (5 rows). Close studio when done.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add seed script with products, banners, vouchers, and shops"
```

---

### Task 3: Utilities, Prisma Singleton, and Types

**Files:**
- Create: `lib/db.ts`
- Create: `lib/utils.ts`
- Create: `types/index.ts`
- Create: `tests/lib/utils.test.ts`

**Interfaces:**
- Produces:
  - `prisma` — singleton `PrismaClient` instance
  - `cn(...inputs: ClassValue[]): string`
  - `formatPrice(price: number): string` → e.g. `"₱1,299"`
  - `formatSold(sold: number): string` → e.g. `"3.4k sold"` or `"892 sold"`
  - `calcDiscount(original: number, current: number): number` → e.g. `35` (percent)
  - TypeScript interfaces: `ProductCard`, `CategoryItem`, `BannerItem`, `VoucherItem`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts:
```json
"test": "vitest run"
```

- [ ] **Step 2: Write failing tests for utils**

Create `tests/lib/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatPrice, formatSold, calcDiscount } from '@/lib/utils'

describe('formatPrice', () => {
  it('formats integer prices with peso sign and commas', () => {
    expect(formatPrice(1299)).toBe('₱1,299')
  })
  it('formats prices over 1000', () => {
    expect(formatPrice(12999)).toBe('₱12,999')
  })
  it('formats prices under 1000 without comma', () => {
    expect(formatPrice(299)).toBe('₱299')
  })
})

describe('formatSold', () => {
  it('shows exact count under 1000', () => {
    expect(formatSold(892)).toBe('892 sold')
  })
  it('abbreviates 1000+ with k', () => {
    expect(formatSold(3420)).toBe('3.4k sold')
  })
  it('abbreviates exactly 1000', () => {
    expect(formatSold(1000)).toBe('1k sold')
  })
})

describe('calcDiscount', () => {
  it('calculates percent discount correctly', () => {
    expect(calcDiscount(1999, 1299)).toBe(35)
  })
  it('returns 0 when prices are equal', () => {
    expect(calcDiscount(999, 999)).toBe(0)
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test
```

Expected: 3 test suites fail with `Cannot find module '@/lib/utils'`

- [ ] **Step 4: Create `lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return `₱${price.toLocaleString('en-PH')}`
}

export function formatSold(sold: number): string {
  if (sold >= 1000) {
    const k = (sold / 1000).toFixed(sold % 1000 === 0 ? 0 : 1)
    return `${k}k sold`
  }
  return `${sold} sold`
}

export function calcDiscount(original: number, current: number): number {
  if (original <= current) return 0
  return Math.round(((original - current) / original) * 100)
}
```

- [ ] **Step 5: Run tests again — all pass**

```bash
npm test
```

Expected: `3 passed`

- [ ] **Step 6: Create `lib/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 7: Create `types/index.ts`**

```typescript
export interface ProductCard {
  id: string
  name: string
  slug: string
  price: number
  originalPrice: number | null
  flashSalePrice: number | null
  flashSaleEndsAt: Date | null
  isFlashSale: boolean
  images: string[]
  rating: number
  reviewCount: number
  sold: number
  shop: {
    name: string
    slug: string
  }
}

export interface CategoryItem {
  id: string
  name: string
  slug: string
  icon: string | null
}

export interface BannerItem {
  id: string
  imageUrl: string
  linkUrl: string | null
  title: string | null
  displayOrder: number
}

export interface VoucherItem {
  id: string
  code: string
  title: string
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  minSpend: number
  maxDiscount: number | null
  expiresAt: Date
}
```

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add lib/ types/ tests/ package.json package-lock.json
git commit -m "feat: add prisma singleton, utility functions, and shared types"
```

---

### Task 4: Brand Tokens + Root Layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `app/not-found.tsx`
- Create: `app/error.tsx`

**Interfaces:**
- Produces: CSS custom properties usable as Tailwind utilities (`bg-brand-700`, `text-brand-600`, etc.)

- [ ] **Step 1: Update `app/globals.css`**

Add brand tokens inside the existing `@theme inline {}` block and brand CSS variables in `:root`. Replace the full file:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* shadcn defaults */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);

  /* 11/7 Eshopee Brand Tokens */
  --color-brand-700: #6D28D9;
  --color-brand-600: #7C3AED;
  --color-brand-400: #A78BFA;
  --color-brand-100: #EDE9FE;
  --color-brand-50:  #F5F3FF;
  --color-accent-hot: #EC4899;
  --color-accent-sale: #EF4444;
  --color-reward: #F59E0B;
  --color-success: #10B981;
  --color-bg-page: #F5F5F5;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: { default: "11/7 Eshopee", template: "%s | 11/7 Eshopee" },
  description: "Shop millions of products at the best prices on 11/7 Eshopee.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-page">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Create `app/not-found.tsx`**

```tsx
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="text-2xl font-semibold text-text-primary">Page not found</h1>
      <p className="text-text-secondary">Sorry, we couldn't find the page you're looking for.</p>
      <Link href="/" className="bg-brand-600 text-white px-6 py-2 rounded-full hover:bg-brand-700 transition-colors">
        Back to Home
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/error.tsx`**

```tsx
"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <p className="text-6xl font-bold text-accent-sale">!</p>
      <h1 className="text-2xl font-semibold text-text-primary">Something went wrong</h1>
      <button onClick={reset} className="bg-brand-600 text-white px-6 py-2 rounded-full hover:bg-brand-700 transition-colors">
        Try again
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx app/not-found.tsx app/error.tsx
git commit -m "feat: add brand design tokens and update root layout metadata"
```

---

### Task 5: UI Component Library

**Files:**
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/SectionHeader.tsx`
- Create: `components/ui/CountdownTimer.tsx`
- Create: `components/ui/CategoryIcon.tsx`
- Create: `components/ui/VoucherCard.tsx`
- Create: `components/ui/ProductCard.tsx`

**Interfaces:**
- Consumes: `formatPrice`, `formatSold`, `calcDiscount` from `@/lib/utils`; `ProductCard`, `CategoryItem`, `VoucherItem` from `@/types`
- Produces: All reusable UI primitives consumed by home section components

- [ ] **Step 1: Create `components/ui/Badge.tsx`**

```tsx
import { cn } from "@/lib/utils"

type BadgeVariant = "sale" | "hot" | "free-shipping" | "new" | "trending"

const variants: Record<BadgeVariant, string> = {
  sale: "bg-accent-sale text-white",
  hot: "bg-accent-hot text-white",
  "free-shipping": "bg-success text-white",
  new: "bg-brand-600 text-white",
  trending: "bg-reward text-white",
}

export function Badge({ variant, label, className }: { variant: BadgeVariant; label: string; className?: string }) {
  return (
    <span className={cn("inline-block text-[10px] font-bold px-1.5 py-0.5 rounded leading-tight", variants[variant], className)}>
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Create `components/ui/SectionHeader.tsx`**

```tsx
import Link from "next/link"

export function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="relative">
        <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide">{title}</h2>
        <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-brand-600 rounded" />
      </div>
      {href && (
        <Link href={href} className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
          View All →
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/ui/CountdownTimer.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"

function getTimeLeft(endsAt: Date) {
  const diff = Math.max(0, endsAt.getTime() - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { h, m, s, expired: diff === 0 }
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function CountdownTimer({ endsAt }: { endsAt: Date }) {
  const [time, setTime] = useState(() => getTimeLeft(endsAt))

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft(endsAt)), 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  if (time.expired) return <span className="text-sm font-medium text-accent-sale">Ended</span>

  return (
    <div className="flex items-center gap-1 text-sm font-mono font-bold">
      {[pad(time.h), pad(time.m), pad(time.s)].map((unit, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="bg-text-primary text-white px-1.5 py-0.5 rounded text-xs">{unit}</span>
          {i < 2 && <span className="text-text-primary">:</span>}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `components/ui/CategoryIcon.tsx`**

```tsx
import Link from "next/link"
import type { CategoryItem } from "@/types"

export function CategoryIcon({ category }: { category: CategoryItem }) {
  return (
    <Link href={`/category/${category.slug}`} className="flex flex-col items-center gap-1.5 min-w-[72px] group">
      <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl group-hover:bg-brand-200 transition-colors">
        {category.icon ?? "🛍️"}
      </div>
      <span className="text-xs text-text-primary text-center leading-tight font-medium">{category.name}</span>
    </Link>
  )
}
```

- [ ] **Step 5: Create `components/ui/VoucherCard.tsx`**

```tsx
import type { VoucherItem } from "@/types"
import { formatPrice } from "@/lib/utils"

export function VoucherCard({ voucher }: { voucher: VoucherItem }) {
  const discount =
    voucher.discountType === "FIXED"
      ? `${formatPrice(voucher.discountValue)} Off`
      : `${voucher.discountValue}% Off`

  return (
    <div className="flex rounded-lg overflow-hidden border border-brand-100 bg-white shadow-sm min-w-[200px]">
      <div className="bg-brand-600 text-white flex flex-col items-center justify-center px-4 py-3 min-w-[80px]">
        <span className="text-xs font-medium opacity-80">Save</span>
        <span className="text-sm font-bold leading-tight text-center">{discount}</span>
      </div>
      <div className="flex flex-col justify-center px-3 py-2 flex-1">
        <p className="text-xs font-semibold text-text-primary leading-tight">{voucher.title}</p>
        {voucher.minSpend > 0 && (
          <p className="text-[10px] text-text-secondary mt-0.5">Min. spend {formatPrice(voucher.minSpend)}</p>
        )}
        <button className="mt-1.5 text-[10px] font-bold text-brand-600 border border-brand-600 rounded px-2 py-0.5 hover:bg-brand-50 transition-colors self-start">
          Claim
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `components/ui/ProductCard.tsx`**

```tsx
import Image from "next/image"
import Link from "next/link"
import { formatPrice, formatSold, calcDiscount } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import type { ProductCard as ProductCardType } from "@/types"

export function ProductCard({ product }: { product: ProductCardType }) {
  const displayPrice = product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price
  const originalPrice = product.originalPrice ?? product.price
  const discount = calcDiscount(originalPrice, displayPrice)
  const imageUrl = product.images[0] ?? "https://placehold.co/400x400/EDE9FE/7C3AED?text=No+Image"

  return (
    <Link href={`/product/${product.slug}`} className="group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-brand-100">
      <div className="relative aspect-square overflow-hidden bg-brand-50">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount >= 5 && (
          <div className="absolute top-2 left-2">
            <Badge variant="sale" label={`-${discount}%`} />
          </div>
        )}
        {product.isFlashSale && (
          <div className="absolute top-2 right-2">
            <Badge variant="hot" label="Flash" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-text-primary font-medium line-clamp-2 leading-snug min-h-[32px]">{product.name}</p>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-accent-sale">{formatPrice(displayPrice)}</span>
          {discount >= 5 && (
            <span className="text-[10px] text-text-secondary line-through">{formatPrice(originalPrice)}</span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <span className="text-reward text-xs">★</span>
            <span className="text-[10px] text-text-secondary">{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-[10px] text-text-secondary">{formatSold(product.sold)}</span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add components/ui/
git commit -m "feat: add ui component library (Badge, SectionHeader, ProductCard, CategoryIcon, VoucherCard, CountdownTimer)"
```

---

### Task 6: Layout Components (Navbar, Footer, CategoryBar)

**Files:**
- Create: `components/layout/Navbar.tsx`
- Create: `components/layout/Footer.tsx`
- Create: `components/layout/CategoryBar.tsx`

**Interfaces:**
- Consumes: `CategoryItem` from `@/types`, `CategoryIcon` from `@/components/ui/CategoryIcon`
- Produces: `<Navbar />`, `<Footer />`, `<CategoryBar categories={CategoryItem[]} />`

- [ ] **Step 1: Create `components/layout/Navbar.tsx`**

```tsx
"use client"

import Link from "next/link"
import { Search, ShoppingCart, Bell, ChevronDown } from "lucide-react"
import { useState } from "react"

export function Navbar() {
  const [search, setSearch] = useState("")

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
          <div className="flex-1 flex items-center bg-white rounded-sm overflow-hidden max-w-2xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, shops, brands..."
              className="flex-1 px-4 py-2 text-text-primary text-sm outline-none"
            />
            <button className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 transition-colors">
              <Search size={18} />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button className="relative hover:text-brand-100 transition-colors">
              <ShoppingCart size={22} />
              <span className="absolute -top-1.5 -right-1.5 bg-accent-sale text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                0
              </span>
            </button>
            <button className="hover:text-brand-100 transition-colors">
              <Bell size={22} />
            </button>
            <div className="h-5 w-px bg-white/30" />
            <Link href="/auth/login" className="text-sm hover:text-brand-100 transition-colors font-medium">
              Login
            </Link>
            <Link href="/auth/register" className="text-sm border border-white/60 px-3 py-1 rounded hover:bg-white/10 transition-colors font-medium">
              Register
            </Link>
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

- [ ] **Step 2: Create `components/layout/Footer.tsx`**

```tsx
import Link from "next/link"

const footerLinks = {
  "Customer Service": ["Help Center", "How to Buy", "Returns & Refunds", "Contact Us"],
  "About 11/7 Eshopee": ["About Us", "Careers", "Blog", "Privacy Policy", "Terms of Service"],
  "Payment & Shipping": ["GCash", "Maya", "Credit Card", "J&T Express", "Ninja Van"],
  "Follow Us": ["Facebook", "Instagram", "TikTok", "YouTube"],
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-8">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-3">{heading}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-xs text-text-secondary hover:text-brand-600 transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">© 2026 11/7 Eshopee. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-secondary">Country & Region:</span>
            <span className="text-xs font-medium text-text-primary">🇵🇭 Philippines</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Create `components/layout/CategoryBar.tsx`**

```tsx
import type { CategoryItem } from "@/types"
import { CategoryIcon } from "@/components/ui/CategoryIcon"

export function CategoryBar({ categories }: { categories: CategoryItem[] }) {
  return (
    <div className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => (
            <CategoryIcon key={cat.id} category={cat} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/layout/
git commit -m "feat: add Navbar, Footer, and CategoryBar layout components"
```

---

### Task 7: Route Groups and Shop Layout

**Files:**
- Create: `app/(shop)/layout.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `app/(seller)/layout.tsx`
- Delete: `app/page.tsx` (replaced by `app/(shop)/page.tsx` in Task 9)

**Interfaces:**
- Consumes: `Navbar`, `Footer` from `@/components/layout`
- Produces: Wrapped layout for all shop pages with sticky Navbar and Footer

- [ ] **Step 1: Create `app/(shop)/layout.tsx`**

```tsx
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Create `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(seller)/layout.tsx`**

```tsx
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-page">
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Delete the placeholder `app/page.tsx`**

This file will be replaced by `app/(shop)/page.tsx` in the next task. Delete it:

```bash
rm app/page.tsx
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "feat: add route groups (shop), (auth), (seller) with isolated layouts"
```

---

### Task 8: Homepage Sections

**Files:**
- Create: `components/home/HeroCarousel.tsx`
- Create: `components/home/VoucherPanel.tsx`
- Create: `components/home/DailyDiscoverPanel.tsx`
- Create: `components/home/FlashSaleSection.tsx`
- Create: `components/home/PromoBannersRow.tsx`
- Create: `components/home/TrendingProductsGrid.tsx`

**Interfaces:**
- Consumes: `BannerItem`, `VoucherItem`, `ProductCard` from `@/types`; `ProductCard` component, `VoucherCard`, `SectionHeader`, `CountdownTimer` from `@/components/ui`
- Produces: All homepage section components with their prop signatures

- [ ] **Step 1: Create `components/home/HeroCarousel.tsx`**

```tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import type { BannerItem } from "@/types"

export function HeroCarousel({ banners }: { banners: BannerItem[] }) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent((c) => (c + 1) % banners.length), [banners.length])

  useEffect(() => {
    const timer = setInterval(next, 4000)
    return () => clearInterval(timer)
  }, [next])

  if (!banners.length) return null

  return (
    <div className="relative w-full aspect-[3/1] overflow-hidden bg-brand-100 rounded-lg">
      {banners.map((banner, i) => (
        <Link
          key={banner.id}
          href={banner.linkUrl ?? "#"}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            src={banner.imageUrl}
            alt={banner.title ?? "Banner"}
            fill
            priority={i === 0}
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
          />
        </Link>
      ))}

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/50"}`}
          />
        ))}
      </div>

      {/* Arrows */}
      <button onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors">‹</button>
      <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors">›</button>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/home/VoucherPanel.tsx`**

```tsx
import type { VoucherItem } from "@/types"
import { VoucherCard } from "@/components/ui/VoucherCard"
import { SectionHeader } from "@/components/ui/SectionHeader"

export function VoucherPanel({ vouchers }: { vouchers: VoucherItem[] }) {
  return (
    <div className="bg-white rounded-lg p-4 flex-1">
      <SectionHeader title="Vouchers" href="/vouchers" />
      <div className="flex flex-col gap-3 overflow-y-auto max-h-[180px] scrollbar-hide">
        {vouchers.map((v) => (
          <VoucherCard key={v.id} voucher={v} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/home/DailyDiscoverPanel.tsx`**

```tsx
import Image from "next/image"
import Link from "next/link"
import { SectionHeader } from "@/components/ui/SectionHeader"
import type { ProductCard } from "@/types"
import { formatPrice } from "@/lib/utils"

export function DailyDiscoverPanel({ products }: { products: ProductCard[] }) {
  return (
    <div className="bg-white rounded-lg p-4 flex-1">
      <SectionHeader title="Daily Discover" href="/discover" />
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 4).map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="group flex flex-col gap-1">
            <div className="relative aspect-square rounded overflow-hidden bg-brand-50">
              <Image
                src={p.images[0] ?? "https://placehold.co/200x200/EDE9FE/7C3AED?text=Product"}
                alt={p.name}
                fill
                sizes="120px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <span className="text-[10px] font-bold text-accent-sale">{formatPrice(p.price)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `components/home/FlashSaleSection.tsx`**

```tsx
import { SectionHeader } from "@/components/ui/SectionHeader"
import { CountdownTimer } from "@/components/ui/CountdownTimer"
import { ProductCard } from "@/components/ui/ProductCard"
import type { ProductCard as ProductCardType } from "@/types"

export function FlashSaleSection({ products, endsAt }: { products: ProductCardType[]; endsAt: Date }) {
  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <h2 className="text-lg font-bold text-accent-hot uppercase tracking-wide">🔥 Flash Sale</h2>
          <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-accent-hot rounded" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">Ends in</span>
          <CountdownTimer endsAt={endsAt} />
          <a href="/flash-sale" className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
            View All →
          </a>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {products.map((p) => (
          <div key={p.id} className="min-w-[160px] max-w-[160px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `components/home/PromoBannersRow.tsx`**

```tsx
import Image from "next/image"
import Link from "next/link"

const PROMO_BANNERS = [
  { imageUrl: "https://placehold.co/400x150/6D28D9/white?text=Free+Shipping", href: "/free-shipping", alt: "Free Shipping" },
  { imageUrl: "https://placehold.co/400x150/EC4899/white?text=Coins+Cashback", href: "/coins", alt: "Coins Cashback" },
  { imageUrl: "https://placehold.co/400x150/F59E0B/white?text=New+User+Deals", href: "/new-user", alt: "New User Deals" },
]

export function PromoBannersRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {PROMO_BANNERS.map((b) => (
        <Link key={b.href} href={b.href} className="relative aspect-[8/3] rounded-lg overflow-hidden group">
          <Image
            src={b.imageUrl}
            alt={b.alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Create `components/home/TrendingProductsGrid.tsx`**

```tsx
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ProductCard } from "@/components/ui/ProductCard"
import type { ProductCard as ProductCardType } from "@/types"

export function TrendingProductsGrid({ products }: { products: ProductCardType[] }) {
  return (
    <div className="bg-white rounded-lg p-4">
      <SectionHeader title="Trending Products" href="/trending" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add components/home/
git commit -m "feat: add all homepage section components"
```

---

### Task 9: Homepage Assembly

**Files:**
- Create: `app/(shop)/page.tsx`
- Create: `app/(shop)/loading.tsx`

**Interfaces:**
- Consumes: All home section components, `prisma` from `@/lib/db`, all `@/types` interfaces

- [ ] **Step 1: Create `app/(shop)/page.tsx`**

```tsx
import { prisma } from "@/lib/db"
import { CategoryBar } from "@/components/layout/CategoryBar"
import { HeroCarousel } from "@/components/home/HeroCarousel"
import { VoucherPanel } from "@/components/home/VoucherPanel"
import { DailyDiscoverPanel } from "@/components/home/DailyDiscoverPanel"
import { FlashSaleSection } from "@/components/home/FlashSaleSection"
import { PromoBannersRow } from "@/components/home/PromoBannersRow"
import { TrendingProductsGrid } from "@/components/home/TrendingProductsGrid"

export default async function HomePage() {
  const [categories, banners, vouchers, flashProducts, trendingProducts, discoverProducts] = await Promise.all([
    prisma.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" } }),
    prisma.banner.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.voucher.findMany({ where: { isActive: true, expiresAt: { gt: new Date() } }, take: 6 }),
    prisma.product.findMany({
      where: { isFlashSale: true, isActive: true },
      include: { shop: { select: { name: true, slug: true } } },
      orderBy: { sold: "desc" },
      take: 10,
    }),
    prisma.product.findMany({
      where: { isTrending: true, isActive: true },
      include: { shop: { select: { name: true, slug: true } } },
      orderBy: { sold: "desc" },
      take: 20,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: { shop: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ])

  const flashSaleEndsAt = flashProducts.find((p) => p.flashSaleEndsAt)?.flashSaleEndsAt ?? new Date(Date.now() + 3600000)

  return (
    <div className="bg-bg-page">
      <CategoryBar categories={categories} />

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Hero + Voucher + Discover row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <HeroCarousel banners={banners} />
          <div className="flex flex-col gap-3">
            <VoucherPanel vouchers={vouchers} />
            <DailyDiscoverPanel products={discoverProducts} />
          </div>
        </div>

        {/* Flash Sale */}
        {flashProducts.length > 0 && (
          <FlashSaleSection products={flashProducts} endsAt={flashSaleEndsAt} />
        )}

        {/* Promo Banners */}
        <PromoBannersRow />

        {/* Trending */}
        {trendingProducts.length > 0 && (
          <TrendingProductsGrid products={trendingProducts} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(shop)/loading.tsx`**

```tsx
export default function HomeLoading() {
  return (
    <div className="bg-bg-page animate-pulse">
      {/* Category bar skeleton */}
      <div className="bg-white border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
              <div className="w-14 h-14 rounded-full bg-brand-100" />
              <div className="w-12 h-3 bg-brand-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Hero skeleton */}
        <div className="w-full aspect-[3/1] bg-brand-100 rounded-lg" />

        {/* Flash sale skeleton */}
        <div className="bg-white rounded-lg p-4">
          <div className="h-6 w-40 bg-brand-100 rounded mb-4" />
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="min-w-[160px] aspect-square bg-brand-100 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Trending skeleton */}
        <div className="bg-white rounded-lg p-4">
          <div className="h-6 w-48 bg-brand-100 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square bg-brand-100 rounded-lg mb-2" />
                <div className="h-3 bg-brand-100 rounded w-3/4 mb-1" />
                <div className="h-3 bg-brand-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Run the dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- [ ] Purple navbar renders with search bar, cart icon, login/register buttons
- [ ] Category icons row scrolls horizontally
- [ ] Hero carousel auto-advances every 4 seconds, arrows work, dots work
- [ ] Voucher panel shows 6 voucher cards with "Claim" button
- [ ] Flash sale section shows countdown timer ticking + horizontal product scroll
- [ ] 3 promo banners render in a row
- [ ] Trending products grid shows 20 products in responsive columns
- [ ] Footer renders with links and copyright

- [ ] **Step 5: Run the build to verify no production errors**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/\(shop\)/
git commit -m "feat: assemble homepage with all sections pulling real data from PostgreSQL"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Covered by Task |
|---|---|
| Purple/lavender brand palette as CSS tokens | Task 4 |
| Full Prisma schema (all phases) | Task 1 |
| Seed: 5 shops, 12 categories, 20 products, 5 banners, 6 vouchers | Task 2 |
| Prisma singleton (`lib/db.ts`) | Task 3 |
| Utility functions: `formatPrice`, `formatSold`, `calcDiscount` | Task 3 |
| Vitest unit tests for utils | Task 3 |
| TypeScript shared types | Task 3 |
| Badge, SectionHeader, CountdownTimer, ProductCard, CategoryIcon, VoucherCard | Task 5 |
| Navbar (client, search, cart, login) | Task 6 |
| Footer (server, links, copyright) | Task 6 |
| CategoryBar (server, from DB) | Task 6 |
| Route groups (shop), (auth), (seller) | Task 7 |
| HeroCarousel (auto-slide, arrows, dots) | Task 8 |
| VoucherPanel | Task 8 |
| DailyDiscoverPanel | Task 8 |
| FlashSaleSection + countdown | Task 8 |
| PromoBannersRow | Task 8 |
| TrendingProductsGrid | Task 8 |
| Homepage `page.tsx` (server, parallel DB queries) | Task 9 |
| Homepage `loading.tsx` skeleton | Task 9 |
| `not-found.tsx` and `error.tsx` | Task 4 |
| Root layout metadata: "11/7 Eshopee" | Task 4 |

**Placeholder scan:** No TBDs, no "implement later", no missing code blocks. All steps include exact commands, file paths, and complete code.

**Type consistency:** `ProductCard` interface defined in `types/index.ts` and consumed by `ProductCard.tsx`, `FlashSaleSection.tsx`, `TrendingProductsGrid.tsx`, `DailyDiscoverPanel.tsx`, and `page.tsx` — consistent throughout. `CategoryItem` used in `CategoryBar.tsx` and `CategoryIcon.tsx` — consistent. `BannerItem` used in `HeroCarousel.tsx` — consistent. `VoucherItem` used in `VoucherPanel.tsx` and `VoucherCard.tsx` — consistent.
