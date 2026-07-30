"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { createNotification } from "@/lib/notifications/create"
import { buildOrderStatusCopy, buildReviewReplyCopy } from "@/lib/notifications/copy"
import type { UpsertProductData } from "@/types/seller"

// ─── Helper ──────────────────────────────────────────────────────────────────

async function getVerifiedShop() {
  const user = await getCurrentUser()
  if (!user || user.role !== "SELLER") return null
  return prisma.shop.findUnique({ where: { ownerId: user.id } })
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

export async function createShop(formData: FormData): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const existing = await prisma.shop.findUnique({ where: { ownerId: user.id } })
  if (existing) return { error: "You already have a shop" }

  const name = (formData.get("name") as string)?.trim()
  const slug = (formData.get("slug") as string)?.trim()
  const logo = (formData.get("logo") as string) || null
  const banner = (formData.get("banner") as string) || null

  if (!name) return { error: "Shop name is required" }
  if (!slug) return { error: "Shop URL is required" }
  if (!/^[a-z0-9-]+$/.test(slug))
    return { error: "Shop URL must be lowercase letters, numbers, and hyphens only" }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.shop.create({
        data: { name, slug, logo, banner, ownerId: user.id, status: "PENDING" },
      })
      await tx.user.update({ where: { id: user.id }, data: { role: "SELLER" } })
    })
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(user.clerkId, {
      publicMetadata: { role: "SELLER" },
    })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "That shop URL is already taken. Try another." }
    return { error: "Failed to create shop. Please try again." }
  }

  redirect("/seller/pending")
}

export async function updateShop(formData: FormData): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop) return { error: "Unauthorized" }

  const name = (formData.get("name") as string)?.trim()
  const logo = (formData.get("logo") as string) || null
  const banner = (formData.get("banner") as string) || null

  if (!name) return { error: "Shop name is required" }

  try {
    await prisma.shop.update({
      where: { id: shop.id },
      data: { name, logo, banner },
    })
  } catch {
    return { error: "Failed to update shop. Please try again." }
  }

  revalidatePath("/seller/settings")
  revalidatePath(`/shop/${shop.slug}`)
  return {}
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function upsertProduct(data: UpsertProductData): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  if (data.id) {
    const existing = await prisma.product.findUnique({ where: { id: data.id } })
    if (!existing || existing.shopId !== shop.id) return { error: "Not found" }
  }

  if (!data.name.trim()) return { error: "Product name is required" }
  if (!data.slug.trim() || !/^[a-z0-9-]+$/.test(data.slug))
    return { error: "Slug must be lowercase letters, numbers, and hyphens only" }
  if (!data.categoryId) return { error: "Category is required" }
  if (data.price < 0) return { error: "Price must be non-negative" }

  try {
    await prisma.$transaction(async (tx) => {
      let productId: string
      if (data.id) {
        await tx.product.update({
          where: { id: data.id },
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            price: data.price,
            originalPrice: data.originalPrice ?? null,
            images: data.images,
            stock: data.variants.length === 0 ? data.stock : 0,
            categoryId: data.categoryId,
            isActive: data.isActive,
            variantOptions: data.variantOptions as any,
          },
        })
        productId = data.id
      } else {
        const product = await tx.product.create({
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            price: data.price,
            originalPrice: data.originalPrice ?? null,
            images: data.images,
            stock: data.variants.length === 0 ? data.stock : 0,
            categoryId: data.categoryId,
            shopId: shop.id,
            isActive: data.isActive,
            variantOptions: data.variantOptions as any,
          },
        })
        productId = product.id
      }

      await tx.productVariant.deleteMany({ where: { productId } })

      if (data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId,
            name: v.name,
            price: v.price,
            stock: v.stock,
            sku: v.sku || null,
            image: v.image || null,
          })),
        })
      }
    })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "A product with that URL already exists." }
    return { error: "Failed to save product. Please try again." }
  }

  revalidatePath("/seller/products")
  return {}
}

export async function toggleProduct(
  productId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.shopId !== shop.id) return { error: "Not found" }

  await prisma.product.update({ where: { id: productId }, data: { isActive } })
  revalidatePath("/seller/products")
  return {}
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.shopId !== shop.id) return { error: "Not found" }

  await prisma.product.update({ where: { id: productId }, data: { isActive: false } })
  revalidatePath("/seller/products")
  return {}
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function shipOrder(
  orderId: string,
  courier: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.shopId !== shop.id) return { error: "Not found" }
  if (order.status !== "PAID") return { error: "Order must be PAID to mark as shipped" }

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } }),
    prisma.shipment.upsert({
      where: { orderId },
      create: { orderId, courier, trackingNumber, status: "SHIPPED" },
      update: { courier, trackingNumber, status: "SHIPPED" },
    }),
  ])

  const shippedCopy = buildOrderStatusCopy(orderId, "SHIPPED")
  if (shippedCopy) await createNotification({ userId: order.userId, ...shippedCopy })

  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/seller/orders")
  return {}
}

export async function cancelOrder(orderId: string): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.shopId !== shop.id) return { error: "Not found" }
  if (order.status !== "PAID") return { error: "Only PAID orders can be cancelled" }

  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } })

  const cancelledCopy = buildOrderStatusCopy(orderId, "CANCELLED")
  if (cancelledCopy) await createNotification({ userId: order.userId, ...cancelledCopy })

  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/seller/orders")
  return {}
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function replyToReview(reviewId: string, comment: string): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop) return { error: "Unauthorized" }

  const trimmed = comment.trim()
  if (!trimmed) return { error: "Reply cannot be empty" }

  const review = await prisma.review.findFirst({
    where: { id: reviewId, product: { shopId: shop.id } },
    select: {
      id: true,
      userId: true,
      reply: { select: { id: true } },
      product: { select: { name: true, slug: true } },
    },
  })
  if (!review) return { error: "Review not found" }
  if (review.reply) return { error: "Already replied to this review" }

  await prisma.reviewReply.create({
    data: { reviewId, shopId: shop.id, comment: trimmed },
  })

  await createNotification({
    userId: review.userId,
    ...buildReviewReplyCopy(review.product.name),
    link: `/product/${review.product.slug}`,
  })

  revalidatePath("/seller/reviews")
  return {}
}
