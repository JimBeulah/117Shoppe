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
