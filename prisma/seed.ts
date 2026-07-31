import { PrismaClient, Role, DiscountType } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local since tsx doesn't load Next.js env automatically
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env.local not found, rely on existing env vars
  }
}

loadEnvLocal()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// DEV SEED ONLY — replace with bcrypt/argon2 when Phase 3 auth is implemented.
function hash(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

const flashSaleEnd = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now

async function main() {
  console.log('Seeding database...')

  // ── Categories ─────────────────────────────────────────────────────────────
  const catDefs = [
    { name: "Men's Apparel",            slug: 'mens-apparel',           icon: '👕' },
    { name: 'Mobiles & Gadgets',        slug: 'mobiles-gadgets',        icon: '📱' },
    { name: 'Mobiles Accessories',      slug: 'mobiles-accessories',    icon: '🔌' },
    { name: 'Home Entertainment',       slug: 'home-entertainment',     icon: '📺' },
    { name: 'Babies & Kids',            slug: 'babies-kids',            icon: '👶' },
    { name: 'Home & Living',            slug: 'home-living',            icon: '🏠' },
    { name: 'Groceries',                slug: 'groceries',              icon: '🛒' },
    { name: 'Toys, Games & Collectibles', slug: 'toys-games-collectibles', icon: '🧸' },
    { name: "Women's Bags",             slug: 'womens-bags',            icon: '👜' },
    { name: 'Women Accessories',        slug: 'women-accessories',      icon: '💍' },
    { name: "Women's Apparel",          slug: 'womens-apparel',         icon: '👗' },
    { name: 'Health & Personal Care',   slug: 'health-personal-care',   icon: '💊' },
    { name: 'Makeup & Fragrances',      slug: 'makeup-fragrances',      icon: '💄' },
    { name: 'Home Appliances',          slug: 'home-appliances',        icon: '🍳' },
    { name: 'Laptops & Computers',      slug: 'laptops-computers',      icon: '💻' },
    { name: 'Cameras',                  slug: 'cameras',                icon: '📷' },
    { name: 'Sports & Travel',          slug: 'sports-travel',          icon: '⚽' },
    { name: "Men's Bags & Accessories", slug: 'mens-bags-accessories',  icon: '🎒' },
    { name: "Men's Shoes",              slug: 'mens-shoes',             icon: '👟' },
    { name: 'Motors',                   slug: 'motors',                 icon: '🏍️' },
    { name: "Women's Shoes",            slug: 'womens-shoes',           icon: '👠' },
    { name: 'Pet Care',                 slug: 'pet-care',               icon: '🐾' },
    { name: 'Audio',                    slug: 'audio',                  icon: '🎧' },
    { name: 'Hobbies & Stationery',     slug: 'hobbies-stationery',     icon: '✏️' },
    { name: 'Gaming',                   slug: 'gaming',                 icon: '🎮' },
  ]

  const categories = await Promise.all(
    catDefs.map((cat, i) =>
      prisma.category.upsert({
        where: { slug: cat.slug },
        update: { displayOrder: i + 1 },
        create: { ...cat, displayOrder: i + 1 },
      })
    )
  )

  const [
    mensApparel, mobilesGadgets, mobilesAccessories, homeEntertainment, babiesKids,
    homeLiving, groceries, toysGames, womensBags, womenAccessories,
    womensApparel, healthPersonalCare, makeupFragrances, homeAppliances, laptopsComputers,
    cameras, sportsTravel, mensBagsAccessories, mensShoes, motors,
    womensShoes, petCare, audio, hobbiesStationery, gaming,
  ] = categories

  // aliases for product assignments below
  const electronics = mobilesGadgets
  const fashion = womensApparel
  const sports = sportsTravel
  const beauty = makeupFragrances

  // ── Users + Shops ──────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@shoppe.com' },
    update: {},
    create: { clerkId: 'seed_admin_clerk_id', name: 'Admin', email: 'admin@shoppe.com', passwordHash: hash('admin123'), role: Role.ADMIN, coins: 0 },
  })

  const sellers = await Promise.all([
    prisma.user.upsert({ where: { email: 'techpro@seller.com' }, update: {}, create: { clerkId: 'seed_seller_techpro_clerk_id', name: 'TechPro Store', email: 'techpro@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 500 } }),
    prisma.user.upsert({ where: { email: 'fashionhub@seller.com' }, update: {}, create: { clerkId: 'seed_seller_fashionhub_clerk_id', name: 'Fashion Hub', email: 'fashionhub@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 300 } }),
    prisma.user.upsert({ where: { email: 'homedecor@seller.com' }, update: {}, create: { clerkId: 'seed_seller_homedecor_clerk_id', name: 'Home Decor Ph', email: 'homedecor@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 200 } }),
    prisma.user.upsert({ where: { email: 'beautyph@seller.com' }, update: {}, create: { clerkId: 'seed_seller_beautyph_clerk_id', name: 'Beauty PH', email: 'beautyph@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 400 } }),
    prisma.user.upsert({ where: { email: 'sportstop@seller.com' }, update: {}, create: { clerkId: 'seed_seller_sportstop_clerk_id', name: 'Sports Top PH', email: 'sportstop@seller.com', passwordHash: hash('seller123'), role: Role.SELLER, coins: 250 } }),
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

  for (const { slug, ...rest } of productData) {
    await prisma.product.upsert({
      where: { slug },
      update: { categoryId: rest.categoryId },
      create: { slug, ...rest },
    })
  }

  // ── Banners ────────────────────────────────────────────────────────────────
  const banners = [
    { imageUrl: 'https://placehold.co/1200x400/6D28D9/white?text=11%2F7+Shoppe+Mega+Sale', title: 'Mega Sale — Up to 70% Off', linkUrl: '/sale', displayOrder: 1 },
    { imageUrl: 'https://placehold.co/1200x400/EC4899/white?text=Flash+Sale+Every+Hour', title: 'Flash Sale Every Hour', linkUrl: '/flash-sale', displayOrder: 2 },
    { imageUrl: 'https://placehold.co/1200x400/7C3AED/white?text=Free+Shipping+All+Orders', title: 'Free Shipping on All Orders', linkUrl: '/free-shipping', displayOrder: 3 },
    { imageUrl: 'https://placehold.co/1200x400/10B981/white?text=New+Arrivals+This+Week', title: 'New Arrivals This Week', linkUrl: '/new', displayOrder: 4 },
    { imageUrl: 'https://placehold.co/1200x400/F59E0B/white?text=Earn+Coins+Every+Purchase', title: 'Earn Shoppe Coins', linkUrl: '/coins', displayOrder: 5 },
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
