"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { requireShopAccess } from "@/lib/seller/access"
import { createNotification } from "@/lib/notifications/create"
import {
  buildOrderStatusCopy,
  buildCoinsEarnedCopy,
  buildReviewReplyCopy,
  buildShopVacationEndCopy,
  buildStaffAddedCopy,
} from "@/lib/notifications/copy"
import { notifyWishlistPriceDrop } from "@/lib/notifications/price-drop"
import { reconcileEligibleCommissions } from "@/lib/payouts/reconcile"
import { MIN_PAYOUT_AMOUNT } from "@/lib/payouts/config"
import { logOrderEvent } from "@/lib/orders/timeline"
import { adjustStock, logStockMovement } from "@/lib/inventory/stock"
import { releaseReservationsForOrder } from "@/lib/inventory/reservations"
import { accrueCoinsForOrder } from "@/lib/coins/accrual"
import { grantCoins } from "@/lib/coins/ledger"
import type { UpsertProductData, BulkProductPatch } from "@/types/seller"
import type { StaffPermission } from "@/lib/generated/prisma/client"

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
  const shop = await requireShopAccess()
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

export async function toggleShopVacation(
  isOnVacation: boolean,
  vacationMessage?: string | null
): Promise<{ error?: string }> {
  const shop = await requireShopAccess()
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const trimmedMessage = vacationMessage?.trim() || null
  if (trimmedMessage && trimmedMessage.length > 200) {
    return { error: "Vacation message is too long" }
  }

  try {
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        isOnVacation,
        vacationMessage: isOnVacation ? trimmedMessage : null,
      },
    })
  } catch {
    return { error: "Failed to update vacation mode. Please try again." }
  }

  if (!isOnVacation) {
    const followers = await prisma.shopFollow.findMany({
      where: { shopId: shop.id },
      select: { userId: true },
    })
    await Promise.all(
      followers.map((f) =>
        createNotification({
          userId: f.userId,
          ...buildShopVacationEndCopy(shop.name, shop.slug),
        })
      )
    )
  }

  revalidatePath("/seller/settings")
  revalidatePath(`/shop/${shop.slug}`)
  revalidatePath("/", "layout")
  return {}
}

// ─── Payouts ──────────────────────────────────────────────────────────────────

export async function requestPayout(): Promise<{ error?: string }> {
  const shop = await requireShopAccess()
  if (!shop) return { error: "Unauthorized" }

  await reconcileEligibleCommissions(shop.id)

  const openPayout = await prisma.payout.findFirst({
    where: { shopId: shop.id, status: { in: ["REQUESTED", "PROCESSING"] } },
  })
  if (openPayout) return { error: "You already have a payout request in progress" }

  const availableEntries = await prisma.commissionEntry.findMany({
    where: { shopId: shop.id, status: "AVAILABLE" },
    select: { id: true, netAmount: true },
  })
  const amount = availableEntries.reduce((sum, e) => sum + e.netAmount, 0)
  if (amount < MIN_PAYOUT_AMOUNT) {
    return { error: `You need at least ₱${MIN_PAYOUT_AMOUNT} available to request a payout` }
  }

  await prisma.$transaction(async (tx) => {
    const payout = await tx.payout.create({ data: { shopId: shop.id, amount } })
    await tx.commissionEntry.updateMany({
      where: { id: { in: availableEntries.map((e) => e.id) } },
      data: { payoutId: payout.id },
    })
  })

  revalidatePath("/seller/payouts")
  return {}
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function upsertProduct(data: UpsertProductData): Promise<{ error?: string }> {
  const shop = await requireShopAccess("PRODUCTS")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  let existing: Awaited<ReturnType<typeof prisma.product.findUnique>> & {
    variants?: { id: string; name: string; stock: number }[]
  } | null = null
  if (data.id) {
    existing = await prisma.product.findUnique({
      where: { id: data.id },
      include: { variants: { select: { id: true, name: true, stock: true } } },
    })
    if (!existing || existing.shopId !== shop.id) return { error: "Not found" }
  }

  if (!data.name.trim()) return { error: "Product name is required" }
  if (!data.slug.trim() || !/^[a-z0-9-]+$/.test(data.slug))
    return { error: "Slug must be lowercase letters, numbers, and hyphens only" }
  if (!data.categoryId) return { error: "Category is required" }
  if (data.price < 0) return { error: "Price must be non-negative" }

  const actor = await getCurrentUser()
  const newStock = data.variants.length === 0 ? data.stock : 0

  try {
    await prisma.$transaction(async (tx) => {
      let productId: string
      if (data.id && existing) {
        await tx.product.update({
          where: { id: data.id },
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            price: data.price,
            originalPrice: data.originalPrice ?? null,
            images: data.images,
            stock: newStock,
            categoryId: data.categoryId,
            brandId: data.brandId || null,
            isActive: data.isActive,
            variantOptions: data.variantOptions as any,
          },
        })
        productId = data.id

        if (existing.stock !== newStock) {
          await logStockMovement(tx, {
            productId,
            shopId: shop.id,
            type: "MANUAL_ADJUSTMENT",
            delta: newStock - existing.stock,
            quantityBefore: existing.stock,
            quantityAfter: newStock,
            reason: "Updated via product edit form",
            actorId: actor?.id,
            actorRole: "SELLER",
          })
        }
      } else {
        const product = await tx.product.create({
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            price: data.price,
            originalPrice: data.originalPrice ?? null,
            images: data.images,
            stock: newStock,
            categoryId: data.categoryId,
            brandId: data.brandId || null,
            shopId: shop.id,
            isActive: data.isActive,
            status: "PENDING",
            variantOptions: data.variantOptions as any,
          },
        })
        productId = product.id

        if (newStock > 0) {
          await logStockMovement(tx, {
            productId,
            shopId: shop.id,
            type: "MANUAL_ADJUSTMENT",
            delta: newStock,
            quantityBefore: 0,
            quantityAfter: newStock,
            reason: "Initial stock set on product creation",
            actorId: actor?.id,
            actorRole: "SELLER",
          })
        }
      }

      // Upsert variants by name so their ids (and stock movement history) stay
      // stable across edits, instead of deleting and recreating every save.
      const existingVariants = existing?.variants ?? []
      const existingByName = new Map(existingVariants.map((v) => [v.name, v]))
      const submittedNames = new Set(data.variants.map((v) => v.name))

      for (const v of data.variants) {
        const match = existingByName.get(v.name)
        if (match) {
          await tx.productVariant.update({
            where: { id: match.id },
            data: { price: v.price, sku: v.sku || null, image: v.image || null, stock: v.stock },
          })
          if (match.stock !== v.stock) {
            await logStockMovement(tx, {
              productId,
              variantId: match.id,
              shopId: shop.id,
              type: "MANUAL_ADJUSTMENT",
              delta: v.stock - match.stock,
              quantityBefore: match.stock,
              quantityAfter: v.stock,
              reason: "Updated via product edit form",
              actorId: actor?.id,
              actorRole: "SELLER",
            })
          }
        } else {
          const created = await tx.productVariant.create({
            data: {
              productId,
              name: v.name,
              price: v.price,
              stock: v.stock,
              sku: v.sku || null,
              image: v.image || null,
            },
          })
          if (v.stock > 0) {
            await logStockMovement(tx, {
              productId,
              variantId: created.id,
              shopId: shop.id,
              type: "MANUAL_ADJUSTMENT",
              delta: v.stock,
              quantityBefore: 0,
              quantityAfter: v.stock,
              reason: "Initial stock set on variant creation",
              actorId: actor?.id,
              actorRole: "SELLER",
            })
          }
        }
      }

      const removedVariantIds = existingVariants
        .filter((v) => !submittedNames.has(v.name))
        .map((v) => v.id)
      if (removedVariantIds.length > 0) {
        await tx.productVariant.deleteMany({ where: { id: { in: removedVariantIds } } })
      }
    })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "A product with that URL already exists." }
    if (e?.code === "P2003")
      return { error: "One of the removed variants has order or inventory history and can't be deleted." }
    return { error: "Failed to save product. Please try again." }
  }

  if (existing && existing.price !== data.price) {
    try {
      await notifyWishlistPriceDrop(data.id!, data.name, data.slug, existing.price, data.price)
    } catch {
      // Notification failures must never block the product save.
    }
  }

  revalidatePath("/seller/products")
  return {}
}

export async function toggleProduct(
  productId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const shop = await requireShopAccess("PRODUCTS")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.shopId !== shop.id) return { error: "Not found" }

  await prisma.product.update({ where: { id: productId }, data: { isActive } })
  revalidatePath("/seller/products")
  return {}
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const shop = await requireShopAccess("PRODUCTS")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.shopId !== shop.id) return { error: "Not found" }

  await prisma.product.update({ where: { id: productId }, data: { isActive: false } })
  revalidatePath("/seller/products")
  return {}
}

export async function bulkUpdateProducts(
  productIds: string[],
  patch: BulkProductPatch
): Promise<{ error?: string; updated?: number }> {
  const shop = await requireShopAccess("PRODUCTS")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }
  if (productIds.length === 0) return { error: "No products selected" }

  const owned = await prisma.product.findMany({
    where: { id: { in: productIds }, shopId: shop.id },
    select: { id: true, name: true, slug: true, price: true },
  })
  if (owned.length === 0) return { error: "No matching products found" }

  if (patch.type === "setActive") {
    await prisma.product.updateMany({
      where: { id: { in: owned.map((p) => p.id) } },
      data: { isActive: patch.isActive },
    })
  } else {
    if (patch.value <= 0) return { error: "Value must be greater than 0" }
    const priceChanges = owned.map((p) => {
      const delta = patch.mode === "percent" ? p.price * (patch.value / 100) : patch.value
      const newPrice =
        Math.round(Math.max(0, patch.direction === "increase" ? p.price + delta : p.price - delta) * 100) / 100
      return { id: p.id, name: p.name, slug: p.slug, oldPrice: p.price, newPrice }
    })

    await prisma.$transaction(
      priceChanges.map((p) => prisma.product.update({ where: { id: p.id }, data: { price: p.newPrice } }))
    )

    try {
      await Promise.all(
        priceChanges.map((p) => notifyWishlistPriceDrop(p.id, p.name, p.slug, p.oldPrice, p.newPrice))
      )
    } catch {
      // Notification failures must never block the bulk update.
    }
  }

  revalidatePath("/seller/products")
  return { updated: owned.length }
}

// ─── Shipping Methods ─────────────────────────────────────────────────────────

export async function toggleShopShippingMethod(methodId: string, isEnabled: boolean): Promise<{ error?: string }> {
  const shop = await requireShopAccess()
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  await prisma.shopShippingMethod.upsert({
    where: { shopId_methodId: { shopId: shop.id, methodId } },
    create: { shopId: shop.id, methodId, isEnabled },
    update: { isEnabled },
  })

  revalidatePath("/seller/settings")
  return {}
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function shipOrder(
  orderId: string,
  courier: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  const shop = await requireShopAccess("ORDERS")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.shopId !== shop.id) return { error: "Not found" }
  if (order.status !== "PAID") return { error: "Order must be PAID to mark as shipped" }

  const seller = await getCurrentUser()

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } })
    await tx.shipment.upsert({
      where: { orderId },
      create: { orderId, courier, trackingNumber, status: "SHIPPED" },
      update: { courier, trackingNumber, status: "SHIPPED" },
    })
    await logOrderEvent(tx, {
      orderId,
      type: "ORDER_SHIPPED",
      message: `Order shipped via ${courier}${trackingNumber ? ` (tracking: ${trackingNumber})` : ""}.`,
      actorId: seller?.id,
      actorRole: "SELLER",
    })
  })

  const shippedCopy = buildOrderStatusCopy(orderId, "SHIPPED")
  if (shippedCopy) await createNotification({ userId: order.userId, ...shippedCopy })

  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/seller/orders")
  return {}
}

const DELIVERY_STATUS_ORDER = ["PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"] as const
type DeliveryStatusValue = (typeof DELIVERY_STATUS_ORDER)[number]

export async function updateDeliveryStatus(orderId: string, status: DeliveryStatusValue): Promise<{ error?: string }> {
  const shop = await requireShopAccess("ORDERS")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }
  if (!DELIVERY_STATUS_ORDER.includes(status)) return { error: "Invalid status" }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { shipment: true } })
  if (!order || order.shopId !== shop.id) return { error: "Not found" }
  if (order.status !== "SHIPPED") return { error: "Order must be SHIPPED before updating delivery status" }
  if (!order.shipment) return { error: "No shipment on file for this order" }

  const currentIndex = DELIVERY_STATUS_ORDER.indexOf(order.shipment.status as DeliveryStatusValue)
  const nextIndex = DELIVERY_STATUS_ORDER.indexOf(status)
  if (nextIndex <= currentIndex) return { error: "Delivery status can only move forward" }

  const seller = await getCurrentUser()

  let coinsEarned = 0

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({ where: { orderId }, data: { status } })
    if (status === "DELIVERED") {
      await tx.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } })
    }
    await logOrderEvent(tx, {
      orderId,
      type: "DELIVERY_STATUS_UPDATED",
      message: `Delivery status updated to ${status.replaceAll("_", " ").toLowerCase()}.`,
      actorId: seller?.id,
      actorRole: "SELLER",
    })
    if (status === "DELIVERED") {
      await logOrderEvent(tx, {
        orderId,
        type: "ORDER_DELIVERED",
        message: "Order delivered.",
        actorId: seller?.id,
        actorRole: "SELLER",
      })
      coinsEarned = await accrueCoinsForOrder(tx, order)
    }
  })

  if (status === "DELIVERED") {
    const deliveredCopy = buildOrderStatusCopy(orderId, "DELIVERED")
    if (deliveredCopy) await createNotification({ userId: order.userId, ...deliveredCopy })
    if (coinsEarned > 0) {
      await createNotification({ userId: order.userId, ...buildCoinsEarnedCopy(orderId, coinsEarned) })
    }
  }

  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/seller/orders")
  return {}
}

export async function cancelOrder(orderId: string): Promise<{ error?: string }> {
  const shop = await requireShopAccess("ORDERS")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order || order.shopId !== shop.id) return { error: "Not found" }
  if (order.status !== "PAID") return { error: "Only PAID orders can be cancelled" }

  const seller = await getCurrentUser()

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } })
    for (const item of order.items) {
      await adjustStock(tx, {
        productId: item.productId,
        variantId: item.variantId,
        shopId: shop.id,
        delta: item.quantity,
        type: "CANCELLATION_RESTOCK",
        orderId,
        actorId: seller?.id,
        actorRole: "SELLER",
      })
    }
    await releaseReservationsForOrder(tx, orderId)
    if (order.coinsUsed > 0) {
      await grantCoins(tx, {
        userId: order.userId,
        coins: order.coinsUsed,
        type: "REFUNDED",
        orderId,
        description: "Coins returned — order cancelled",
      })
    }
    await logOrderEvent(tx, {
      orderId,
      type: "ORDER_CANCELLED",
      message: "Order cancelled by seller.",
      actorId: seller?.id,
      actorRole: "SELLER",
    })
  })

  const cancelledCopy = buildOrderStatusCopy(orderId, "CANCELLED")
  if (cancelledCopy) await createNotification({ userId: order.userId, ...cancelledCopy })

  revalidatePath(`/seller/orders/${orderId}`)
  revalidatePath("/seller/orders")
  return {}
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function replyToReview(reviewId: string, comment: string): Promise<{ error?: string }> {
  const shop = await requireShopAccess("REVIEWS")
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

// ─── Staff ────────────────────────────────────────────────────────────────────

export async function addStaffMember(
  email: string,
  permissions: StaffPermission[]
): Promise<{ error?: string }> {
  const shop = await requireShopAccess()
  if (!shop) return { error: "Unauthorized" }

  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail) return { error: "Email is required" }
  if (permissions.length === 0) return { error: "Select at least one permission" }

  const targetUser = await prisma.user.findUnique({ where: { email: trimmedEmail } })
  if (!targetUser) return { error: "No registered user found with that email" }
  if (targetUser.id === shop.ownerId) return { error: "You can't add yourself as staff on your own shop" }

  const owner = await getCurrentUser()
  if (!owner) return { error: "Unauthorized" }

  try {
    await prisma.shopStaff.create({
      data: { shopId: shop.id, userId: targetUser.id, permissions, invitedById: owner.id },
    })
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "That user is already staff on this shop" }
    return { error: "Failed to add staff member. Please try again." }
  }

  await createNotification({
    userId: targetUser.id,
    ...buildStaffAddedCopy(shop.name),
  })

  revalidatePath("/seller/settings/staff")
  return {}
}

export async function updateStaffPermissions(
  staffId: string,
  permissions: StaffPermission[]
): Promise<{ error?: string }> {
  const shop = await requireShopAccess()
  if (!shop) return { error: "Unauthorized" }
  if (permissions.length === 0) return { error: "Select at least one permission" }

  const staff = await prisma.shopStaff.findUnique({ where: { id: staffId } })
  if (!staff || staff.shopId !== shop.id) return { error: "Not found" }

  await prisma.shopStaff.update({ where: { id: staffId }, data: { permissions } })
  revalidatePath("/seller/settings/staff")
  return {}
}

export async function removeStaffMember(staffId: string): Promise<{ error?: string }> {
  const shop = await requireShopAccess()
  if (!shop) return { error: "Unauthorized" }

  const staff = await prisma.shopStaff.findUnique({ where: { id: staffId } })
  if (!staff || staff.shopId !== shop.id) return { error: "Not found" }

  await prisma.shopStaff.delete({ where: { id: staffId } })
  revalidatePath("/seller/settings/staff")
  return {}
}

// ─── Vouchers ─────────────────────────────────────────────────────────────────

export async function createSellerVoucher(data: {
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
  const shop = await requireShopAccess("VOUCHERS")
  if (!shop) return { error: "Unauthorized" }
  if (shop.status !== "ACTIVE") return { error: "Shop must be active to create vouchers" }
  if (!data.code.trim()) return { error: "Code is required" }
  if (!data.title.trim()) return { error: "Title is required" }
  if (data.discountValue <= 0) return { error: "Discount value must be positive" }
  try {
    await prisma.voucher.create({ data: { ...data, shopId: shop.id } })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") return { error: "Voucher code already exists" }
    return { error: "Failed to create voucher" }
  }
  revalidatePath("/seller/vouchers")
  return {}
}

export async function updateSellerVoucher(id: string, data: {
  title: string
  discountType: "PERCENT" | "FIXED"
  discountValue: number
  minSpend: number
  maxDiscount: number | null
  expiresAt: Date
  usageLimit: number | null
  isActive: boolean
}): Promise<{ error?: string }> {
  const shop = await requireShopAccess("VOUCHERS")
  if (!shop) return { error: "Unauthorized" }
  const existing = await prisma.voucher.findUnique({ where: { id } })
  if (!existing || existing.shopId !== shop.id) return { error: "Voucher not found" }
  if (!data.title.trim()) return { error: "Title is required" }
  if (data.discountValue <= 0) return { error: "Discount value must be positive" }
  await prisma.voucher.update({ where: { id }, data })
  revalidatePath("/seller/vouchers")
  return {}
}

export async function deactivateSellerVoucher(id: string): Promise<{ error?: string }> {
  const shop = await requireShopAccess("VOUCHERS")
  if (!shop) return { error: "Unauthorized" }
  const existing = await prisma.voucher.findUnique({ where: { id } })
  if (!existing || existing.shopId !== shop.id) return { error: "Voucher not found" }
  await prisma.voucher.update({ where: { id }, data: { isActive: false } })
  revalidatePath("/seller/vouchers")
  return {}
}
