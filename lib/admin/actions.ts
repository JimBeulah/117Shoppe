"use server"

import { revalidatePath } from "next/cache"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { createNotification } from "@/lib/notifications/create"
import { buildOrderStatusCopy } from "@/lib/notifications/copy"

export async function assertAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") throw new Error("Unauthorized")
}

// ─── Sellers ──────────────────────────────────────────────────────────────────

export async function approveShop(shopId: string): Promise<{ error?: string }> {
  await assertAdmin()
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

  revalidatePath("/admin/sellers")
  revalidatePath("/admin/dashboard")
  return {}
}

export async function rejectShop(shopId: string, reason: string): Promise<{ error?: string }> {
  await assertAdmin()
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

  revalidatePath("/admin/sellers")
  revalidatePath("/admin/dashboard")
  return {}
}

export async function updateShopCommissionRate(shopId: string, rate: number): Promise<{ error?: string }> {
  await assertAdmin()
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return { error: "Commission rate must be between 0 and 100" }
  }

  await prisma.shop.update({ where: { id: shopId }, data: { commissionRate: rate } })

  revalidatePath("/admin/sellers")
  return {}
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function promoteToSeller(userId: string, clerkId: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { role: "SELLER" } })
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role: "SELLER" } })
  } catch {
    return { error: "Role saved but Clerk sync failed — please retry" }
  }
  revalidatePath("/admin/users")
  return {}
}

export async function demoteToBuyer(userId: string, clerkId: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { role: "BUYER" } })
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role: "BUYER" } })
  } catch {
    return { error: "Role saved but Clerk sync failed — please retry" }
  }
  revalidatePath("/admin/users")
  return {}
}

export async function banUser(userId: string, clerkId: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { isBanned: true } })
  try {
    const clerk = await clerkClient()
    await clerk.users.banUser(clerkId)
  } catch {
    return { error: "Banned in DB but Clerk sync failed — please retry" }
  }
  revalidatePath("/admin/users")
  return {}
}

export async function unbanUser(userId: string, clerkId: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { isBanned: false } })
  try {
    const clerk = await clerkClient()
    await clerk.users.unbanUser(clerkId)
  } catch {
    return { error: "Unbanned in DB but Clerk sync failed — please retry" }
  }
  revalidatePath("/admin/users")
  return {}
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function adminToggleProduct(productId: string, isActive: boolean): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.product.update({ where: { id: productId }, data: { isActive } })
  revalidatePath("/admin/products")
  return {}
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function createCategory(
  name: string,
  slug: string,
  icon: string | null,
  parentId: string | null
): Promise<{ error?: string }> {
  await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug must be lowercase letters, numbers, hyphens" }
  try {
    await prisma.category.create({ data: { name, slug, icon, parentId: parentId || null } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Slug already in use" }
    return { error: "Failed to create category" }
  }
  revalidatePath("/admin/categories")
  return {}
}

export async function updateCategory(
  id: string,
  name: string,
  slug: string,
  icon: string | null,
  parentId: string | null
): Promise<{ error?: string }> {
  await assertAdmin()
  if (!name.trim()) return { error: "Name is required" }
  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) return { error: "Slug must be lowercase letters, numbers, hyphens" }
  try {
    await prisma.category.update({ where: { id }, data: { name, slug, icon, parentId: parentId || null } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Slug already in use" }
    return { error: "Failed to update category" }
  }
  revalidatePath("/admin/categories")
  return {}
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await assertAdmin()
  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) return { error: `Cannot delete: ${count} product(s) use this category` }
  await prisma.category.delete({ where: { id } })
  revalidatePath("/admin/categories")
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
  await assertAdmin()
  if (!imageUrl.trim()) return { error: "Image URL is required" }
  await prisma.banner.create({ data: { imageUrl, title, linkUrl, displayOrder, isActive } })
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}

export async function toggleBanner(id: string, isActive: boolean): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.banner.update({ where: { id }, data: { isActive } })
  revalidatePath("/admin/banners")
  revalidatePath("/")
  return {}
}

export async function deleteBanner(id: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.banner.delete({ where: { id } })
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
  await assertAdmin()
  if (!imageUrl.trim()) return { error: "Image URL is required" }
  await prisma.banner.update({ where: { id }, data: { imageUrl, title, linkUrl, displayOrder } })
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
  await assertAdmin()
  if (!data.code.trim()) return { error: "Code is required" }
  if (!data.title.trim()) return { error: "Title is required" }
  if (data.discountValue <= 0) return { error: "Discount value must be positive" }
  try {
    await prisma.voucher.create({ data })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Voucher code already exists" }
    return { error: "Failed to create voucher" }
  }
  revalidatePath("/admin/vouchers")
  return {}
}

export async function deactivateVoucher(id: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.voucher.update({ where: { id }, data: { isActive: false } })
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
  await assertAdmin()
  if (!data.title.trim()) return { error: "Title is required" }
  if (data.discountValue <= 0) return { error: "Discount value must be positive" }
  await prisma.voucher.update({ where: { id }, data })
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
  await assertAdmin()
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
  await assertAdmin()
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

  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
  revalidatePath("/flash-sale")
  return {}
}

export async function deleteFlashSale(id: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.$transaction([
    prisma.flashSaleItem.deleteMany({ where: { flashSaleId: id } }),
    prisma.flashSale.delete({ where: { id } }),
  ])
  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
  revalidatePath("/flash-sale")
  return {}
}

// ─── Orders ───────────────────────────────────────────────────────────────────

const VALID_ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const
type OrderStatus = typeof VALID_ORDER_STATUSES[number]

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ error?: string }> {
  await assertAdmin()
  if (!VALID_ORDER_STATUSES.includes(status)) return { error: "Invalid status" }

  const updates: any[] = [prisma.order.update({ where: { id: orderId }, data: { status } })]
  if (status === "CANCELLED" || status === "REFUNDED") {
    updates.push(
      prisma.commissionEntry.updateMany({
        where: { orderId, status: { in: ["PENDING", "AVAILABLE"] } },
        data: { status: "REVERSED" },
      })
    )
  }
  const [order] = await prisma.$transaction(updates)

  const copy = buildOrderStatusCopy(orderId, status)
  if (copy) await createNotification({ userId: order.userId, ...copy })

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath("/admin/orders")
  return {}
}
