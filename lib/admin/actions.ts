"use server"

import { revalidatePath } from "next/cache"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { createNotification } from "@/lib/notifications/create"
import { buildOrderStatusCopy } from "@/lib/notifications/copy"
import { writeAuditLog } from "@/lib/admin/audit"
import { logOrderEvent } from "@/lib/orders/timeline"

export async function assertAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") throw new Error("Unauthorized")
  return user
}

// ─── Sellers ──────────────────────────────────────────────────────────────────

export async function approveShop(shopId: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, include: { owner: true } })
  if (!shop) return { error: "Shop not found" }

  await prisma.$transaction([
    prisma.shop.update({ where: { id: shopId }, data: { status: "ACTIVE", rejectionReason: null } }),
    prisma.user.update({ where: { id: shop.ownerId }, data: { role: "SELLER" } }),
  ])
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(shop.owner.clerkId, { publicMetadata: { role: "SELLER" } })
  } catch {
    return { error: "Role saved but Clerk sync failed — please retry" }
  }

  await writeAuditLog(admin.id, "shop.approve", "Shop", shopId)
  revalidatePath("/admin/sellers")
  revalidatePath("/admin/dashboard")
  return {}
}

export async function rejectShop(shopId: string, reason: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!reason.trim()) return { error: "Rejection reason is required" }
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, include: { owner: true } })
  if (!shop) return { error: "Shop not found" }

  await prisma.$transaction([
    prisma.shop.update({ where: { id: shopId }, data: { status: "REJECTED", rejectionReason: reason } }),
    prisma.user.update({ where: { id: shop.ownerId }, data: { role: "BUYER" } }),
  ])
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(shop.owner.clerkId, { publicMetadata: { role: "BUYER" } })
  } catch {
    return { error: "Role saved but Clerk sync failed — please retry" }
  }

  await writeAuditLog(admin.id, "shop.reject", "Shop", shopId, { reason })
  revalidatePath("/admin/sellers")
  revalidatePath("/admin/dashboard")
  return {}
}

export async function updateShopCommissionRate(shopId: string, rate: number): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return { error: "Commission rate must be between 0 and 100" }
  }

  await prisma.shop.update({ where: { id: shopId }, data: { commissionRate: rate } })

  await writeAuditLog(admin.id, "shop.updateCommissionRate", "Shop", shopId, { rate })
  revalidatePath("/admin/sellers")
  return {}
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function promoteToSeller(userId: string, clerkId: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { role: "SELLER" } })
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role: "SELLER" } })
  } catch {
    return { error: "Role saved but Clerk sync failed — please retry" }
  }
  await writeAuditLog(admin.id, "user.promoteToSeller", "User", userId)
  revalidatePath("/admin/users")
  return {}
}

export async function demoteToBuyer(userId: string, clerkId: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { role: "BUYER" } })
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role: "BUYER" } })
  } catch {
    return { error: "Role saved but Clerk sync failed — please retry" }
  }
  await writeAuditLog(admin.id, "user.demoteToBuyer", "User", userId)
  revalidatePath("/admin/users")
  return {}
}

export async function banUser(userId: string, clerkId: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { isBanned: true } })
  try {
    const clerk = await clerkClient()
    await clerk.users.banUser(clerkId)
  } catch {
    return { error: "Banned in DB but Clerk sync failed — please retry" }
  }
  await writeAuditLog(admin.id, "user.ban", "User", userId)
  revalidatePath("/admin/users")
  return {}
}

export async function unbanUser(userId: string, clerkId: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { isBanned: false } })
  try {
    const clerk = await clerkClient()
    await clerk.users.unbanUser(clerkId)
  } catch {
    return { error: "Unbanned in DB but Clerk sync failed — please retry" }
  }
  await writeAuditLog(admin.id, "user.unban", "User", userId)
  revalidatePath("/admin/users")
  return {}
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function adminToggleProduct(productId: string, isActive: boolean): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.product.update({ where: { id: productId }, data: { isActive } })
  await writeAuditLog(admin.id, "product.toggleActive", "Product", productId, { isActive })
  revalidatePath("/admin/products")
  return {}
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function createCategory(
  name: string,
  slug: string,
  icon: string | null,
  imageUrl: string | null,
  parentId: string | null
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug must be lowercase letters, numbers, hyphens" }
  let category: { id: string }
  try {
    category = await prisma.category.create({ data: { name, slug, icon, imageUrl, parentId: parentId || null } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Slug already in use" }
    return { error: "Failed to create category" }
  }
  await writeAuditLog(admin.id, "category.create", "Category", category.id, { name, slug })
  revalidatePath("/admin/categories")
  return {}
}

export async function updateCategory(
  id: string,
  name: string,
  slug: string,
  icon: string | null,
  imageUrl: string | null,
  parentId: string | null
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug must be lowercase letters, numbers, hyphens" }
  try {
    await prisma.category.update({ where: { id }, data: { name, slug, icon, imageUrl, parentId: parentId || null } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Slug already in use" }
    return { error: "Failed to update category" }
  }
  await writeAuditLog(admin.id, "category.update", "Category", id, { name, slug })
  revalidatePath("/admin/categories")
  return {}
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) return { error: `Cannot delete: ${count} product(s) use this category` }
  await prisma.category.delete({ where: { id } })
  await writeAuditLog(admin.id, "category.delete", "Category", id)
  revalidatePath("/admin/categories")
  return {}
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function createBrand(
  name: string,
  slug: string,
  logoUrl: string | null
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug must be lowercase letters, numbers, hyphens" }
  let brand: { id: string }
  try {
    brand = await prisma.brand.create({ data: { name, slug, logoUrl } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Slug already in use" }
    return { error: "Failed to create brand" }
  }
  await writeAuditLog(admin.id, "brand.create", "Brand", brand.id, { name, slug })
  revalidatePath("/admin/brands")
  return {}
}

export async function updateBrand(
  id: string,
  name: string,
  slug: string,
  logoUrl: string | null
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug must be lowercase letters, numbers, hyphens" }
  try {
    await prisma.brand.update({ where: { id }, data: { name, slug, logoUrl } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Slug already in use" }
    return { error: "Failed to update brand" }
  }
  await writeAuditLog(admin.id, "brand.update", "Brand", id, { name, slug })
  revalidatePath("/admin/brands")
  return {}
}

export async function deleteBrand(id: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  const count = await prisma.product.count({ where: { brandId: id } })
  if (count > 0) return { error: `Cannot delete: ${count} product(s) use this brand` }
  await prisma.brand.delete({ where: { id } })
  await writeAuditLog(admin.id, "brand.delete", "Brand", id)
  revalidatePath("/admin/brands")
  return {}
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export async function createBanner(
  imageUrl: string,
  title: string | null,
  linkUrl: string | null,
  displayOrder: number,
  isActive: boolean
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!imageUrl.trim()) return { error: "Image URL is required" }
  const banner = await prisma.banner.create({ data: { imageUrl, title, linkUrl, displayOrder, isActive } })
  await writeAuditLog(admin.id, "banner.create", "Banner", banner.id)
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}

export async function toggleBanner(id: string, isActive: boolean): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.banner.update({ where: { id }, data: { isActive } })
  await writeAuditLog(admin.id, "banner.toggle", "Banner", id, { isActive })
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}

export async function deleteBanner(id: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.banner.delete({ where: { id } })
  await writeAuditLog(admin.id, "banner.delete", "Banner", id)
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}

export async function updateBanner(
  id: string,
  imageUrl: string,
  title: string | null,
  linkUrl: string | null,
  displayOrder: number
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!imageUrl.trim()) return { error: "Image URL is required" }
  await prisma.banner.update({ where: { id }, data: { imageUrl, title, linkUrl, displayOrder } })
  await writeAuditLog(admin.id, "banner.update", "Banner", id)
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}

// ─── Vouchers ─────────────────────────────────────────────────────────────────

export async function createVoucher(data: {
  code: string
  title: string
  discountType: "PERCENT" | "FIXED"
  discountValue: number
  minSpend: number
  maxDiscount: number | null
  expiresAt: Date
  usageLimit: number | null
  isActive: boolean
}): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!data.code.trim()) return { error: "Code is required" }
  if (!data.title.trim()) return { error: "Title is required" }
  if (data.discountValue <= 0) return { error: "Discount value must be positive" }
  let voucher: { id: string }
  try {
    voucher = await prisma.voucher.create({ data })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Voucher code already exists" }
    return { error: "Failed to create voucher" }
  }
  await writeAuditLog(admin.id, "voucher.create", "Voucher", voucher.id, { code: data.code })
  revalidatePath("/admin/vouchers")
  return {}
}

export async function deactivateVoucher(id: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.voucher.update({ where: { id }, data: { isActive: false } })
  await writeAuditLog(admin.id, "voucher.deactivate", "Voucher", id)
  revalidatePath("/admin/vouchers")
  return {}
}

export async function updateVoucher(id: string, data: {
  title: string
  discountType: "PERCENT" | "FIXED"
  discountValue: number
  minSpend: number
  maxDiscount: number | null
  expiresAt: Date
  usageLimit: number | null
  isActive: boolean
}): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!data.title.trim()) return { error: "Title is required" }
  if (data.discountValue <= 0) return { error: "Discount value must be positive" }
  await prisma.voucher.update({ where: { id }, data })
  await writeAuditLog(admin.id, "voucher.update", "Voucher", id)
  revalidatePath("/admin/vouchers")
  return {}
}

// ─── Flash Sales ──────────────────────────────────────────────────────────────

type FlashSaleItemInput = { productId: string; salePrice: number; stock: number }

export async function createFlashSale(
  title: string,
  startsAt: Date,
  endsAt: Date,
  isActive: boolean,
  items: FlashSaleItemInput[]
): Promise<{ error?: string; id?: string }> {
  const admin = await assertAdmin()
  if (!title.trim()) return { error: "Title is required" }
  if (endsAt <= startsAt) return { error: "End time must be after start time" }

  let flashSale: { id: string }
  try {
    flashSale = await prisma.flashSale.create({
      data: {
        title,
        startsAt,
        endsAt,
        isActive,
        items: { create: items.map((i) => ({ productId: i.productId, salePrice: i.salePrice, stock: i.stock })) },
      },
    })
  } catch (e: any) {
    if (e?.code === "P2003") return { error: "One or more product IDs not found" }
    return { error: "Failed to create flash sale" }
  }

  await writeAuditLog(admin.id, "flashSale.create", "FlashSale", flashSale.id, { title })
  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
  revalidatePath("/flash-sale")
  return { id: flashSale.id }
}

export async function updateFlashSale(
  id: string,
  title: string,
  startsAt: Date,
  endsAt: Date,
  isActive: boolean,
  items: FlashSaleItemInput[]
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!title.trim()) return { error: "Title is required" }
  if (endsAt <= startsAt) return { error: "End time must be after start time" }

  try {
    await prisma.$transaction([
      prisma.flashSaleItem.deleteMany({ where: { flashSaleId: id } }),
      prisma.flashSale.update({
        where: { id },
        data: {
          title,
          startsAt,
          endsAt,
          isActive,
          items: { create: items.map((i) => ({ productId: i.productId, salePrice: i.salePrice, stock: i.stock })) },
        },
      }),
    ])
  } catch (e: any) {
    if (e?.code === "P2003") return { error: "One or more product IDs not found" }
    return { error: "Failed to update flash sale" }
  }

  await writeAuditLog(admin.id, "flashSale.update", "FlashSale", id, { title })
  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
  revalidatePath("/flash-sale")
  return {}
}

export async function deleteFlashSale(id: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.$transaction([
    prisma.flashSaleItem.deleteMany({ where: { flashSaleId: id } }),
    prisma.flashSale.delete({ where: { id } }),
  ])
  await writeAuditLog(admin.id, "flashSale.delete", "FlashSale", id)
  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
  revalidatePath("/flash-sale")
  return {}
}

// ─── Shipping ─────────────────────────────────────────────────────────────────

export async function createShippingMethod(
  name: string,
  carrier: string,
  description: string | null
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!carrier.trim()) return { error: "Carrier is required" }
  const method = await prisma.shippingMethod.create({ data: { name, carrier, description } })
  await writeAuditLog(admin.id, "shippingMethod.create", "ShippingMethod", method.id, { name, carrier })
  revalidatePath("/admin/shipping")
  return {}
}

export async function updateShippingMethod(
  id: string,
  name: string,
  carrier: string,
  description: string | null,
  isActive: boolean
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!carrier.trim()) return { error: "Carrier is required" }
  await prisma.shippingMethod.update({ where: { id }, data: { name, carrier, description, isActive } })
  await writeAuditLog(admin.id, "shippingMethod.update", "ShippingMethod", id, { name, carrier })
  revalidatePath("/admin/shipping")
  return {}
}

export async function deleteShippingMethod(id: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  const orderCount = await prisma.order.count({ where: { shippingMethodId: id } })
  if (orderCount > 0) return { error: `Cannot delete: ${orderCount} order(s) used this method` }
  await prisma.$transaction([
    prisma.shippingRate.deleteMany({ where: { methodId: id } }),
    prisma.shopShippingMethod.deleteMany({ where: { methodId: id } }),
    prisma.shippingMethod.delete({ where: { id } }),
  ])
  await writeAuditLog(admin.id, "shippingMethod.delete", "ShippingMethod", id)
  revalidatePath("/admin/shipping")
  return {}
}

export async function createShippingZone(name: string, provinces: string[]): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (provinces.length === 0) return { error: "Select at least one province" }
  let zone: { id: string }
  try {
    zone = await prisma.shippingZone.create({ data: { name, provinces } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Zone name already in use" }
    return { error: "Failed to create zone" }
  }
  await writeAuditLog(admin.id, "shippingZone.create", "ShippingZone", zone.id, { name })
  revalidatePath("/admin/shipping")
  return {}
}

export async function updateShippingZone(
  id: string,
  name: string,
  provinces: string[]
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (provinces.length === 0) return { error: "Select at least one province" }
  try {
    await prisma.shippingZone.update({ where: { id }, data: { name, provinces } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Zone name already in use" }
    return { error: "Failed to update zone" }
  }
  await writeAuditLog(admin.id, "shippingZone.update", "ShippingZone", id, { name })
  revalidatePath("/admin/shipping")
  return {}
}

export async function deleteShippingZone(id: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  await prisma.$transaction([
    prisma.shippingRate.deleteMany({ where: { zoneId: id } }),
    prisma.shippingZone.delete({ where: { id } }),
  ])
  await writeAuditLog(admin.id, "shippingZone.delete", "ShippingZone", id)
  revalidatePath("/admin/shipping")
  return {}
}

export async function upsertShippingRate(
  methodId: string,
  zoneId: string,
  price: number,
  estimatedDaysMin: number,
  estimatedDaysMax: number
): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be a positive number" }
  if (!Number.isFinite(estimatedDaysMin) || !Number.isFinite(estimatedDaysMax) || estimatedDaysMin < 1 || estimatedDaysMax < estimatedDaysMin) {
    return { error: "Estimated delivery days are invalid" }
  }
  await prisma.shippingRate.upsert({
    where: { methodId_zoneId: { methodId, zoneId } },
    create: { methodId, zoneId, price, estimatedDaysMin, estimatedDaysMax },
    update: { price, estimatedDaysMin, estimatedDaysMax },
  })
  await writeAuditLog(admin.id, "shippingRate.upsert", "ShippingRate", `${methodId}:${zoneId}`, { price })
  revalidatePath("/admin/shipping")
  return {}
}

// ─── Orders ───────────────────────────────────────────────────────────────────

const VALID_ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const
type OrderStatus = typeof VALID_ORDER_STATUSES[number]

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!VALID_ORDER_STATUSES.includes(status)) return { error: "Invalid status" }

  const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } })
  if (!existing) return { error: "Order not found" }
  const fromStatus = existing.status

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({ where: { id: orderId }, data: { status } })
    if (status === "CANCELLED" || status === "REFUNDED") {
      await tx.commissionEntry.updateMany({
        where: { orderId, status: { in: ["PENDING", "AVAILABLE"] } },
        data: { status: "REVERSED" },
      })
    }
    await logOrderEvent(tx, {
      orderId,
      type: "ORDER_STATUS_CHANGED_BY_ADMIN",
      message: `Order status changed from ${fromStatus} to ${status} by admin.`,
      actorId: admin.id,
      actorRole: "ADMIN",
      metadata: { from: fromStatus, to: status },
    })
    return updated
  })

  const copy = buildOrderStatusCopy(orderId, status)
  if (copy) await createNotification({ userId: order.userId, ...copy })

  await writeAuditLog(admin.id, "order.updateStatus", "Order", orderId, { status })
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath("/admin/orders")
  return {}
}
