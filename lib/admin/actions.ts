"use server"

import { revalidatePath } from "next/cache"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"

async function assertAdmin() {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== "ADMIN") throw new Error("Unauthorized")
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
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(shop.owner.clerkId, { publicMetadata: { role: "SELLER" } })

  revalidatePath("/admin/sellers")
  revalidatePath("/admin/dashboard")
  return {}
}

export async function rejectShop(shopId: string, reason: string): Promise<{ error?: string }> {
  await assertAdmin()
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, include: { owner: true } })
  if (!shop) return { error: "Shop not found" }

  await prisma.$transaction([
    prisma.shop.update({ where: { id: shopId }, data: { status: "REJECTED", rejectionReason: reason } }),
    prisma.user.update({ where: { id: shop.ownerId }, data: { role: "BUYER" } }),
  ])
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(shop.owner.clerkId, { publicMetadata: { role: "BUYER" } })

  revalidatePath("/admin/sellers")
  revalidatePath("/admin/dashboard")
  return {}
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function promoteToSeller(userId: string, clerkId: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { role: "SELLER" } })
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role: "SELLER" } })
  revalidatePath("/admin/users")
  return {}
}

export async function demoteToBuyer(userId: string, clerkId: string): Promise<{ error?: string }> {
  await assertAdmin()
  await prisma.user.update({ where: { id: userId }, data: { role: "BUYER" } })
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(clerkId, { publicMetadata: { role: "BUYER" } })
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

  const flashSale = await prisma.flashSale.create({
    data: {
      title,
      startsAt,
      endsAt,
      isActive,
      items: { create: items.map((i) => ({ productId: i.productId, salePrice: i.salePrice, stock: i.stock })) },
    },
  })

  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
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

  revalidatePath("/admin/flash-sales")
  revalidatePath("/")
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
  return {}
}
