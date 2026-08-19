"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { requireShopAccess } from "@/lib/seller/access"
import { assertAdmin } from "@/lib/admin/actions"
import { adjustStock } from "@/lib/inventory/stock"
import type { StockMovementType } from "@/lib/generated/prisma/client"

const ADJUSTMENT_TYPES: StockMovementType[] = ["MANUAL_ADJUSTMENT", "RESTOCK_IN"]

async function applyAdjustment(params: {
  productId: string
  variantId: string | null
  shopId: string
  delta: number
  type: StockMovementType
  reason: string
  actorId: string
  actorRole: "SELLER" | "ADMIN"
}): Promise<{ error?: string }> {
  if (!ADJUSTMENT_TYPES.includes(params.type)) return { error: "Invalid adjustment type" }
  if (!Number.isFinite(params.delta) || params.delta === 0) return { error: "Enter a non-zero quantity" }
  if (!params.reason.trim()) return { error: "A reason is required" }

  try {
    await prisma.$transaction(async (tx) => {
      await adjustStock(tx, {
        productId: params.productId,
        variantId: params.variantId,
        shopId: params.shopId,
        delta: params.delta,
        type: params.type,
        reason: params.reason.trim(),
        actorId: params.actorId,
        actorRole: params.actorRole,
      })
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to adjust stock." }
  }

  return {}
}

export async function sellerAdjustStock(formData: FormData): Promise<{ error?: string }> {
  const shop = await requireShopAccess("INVENTORY")
  if (!shop || shop.status !== "ACTIVE") return { error: "Unauthorized" }
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const productId = formData.get("productId") as string
  const variantId = (formData.get("variantId") as string) || null
  const delta = Number(formData.get("delta"))
  const type = formData.get("type") as StockMovementType
  const reason = (formData.get("reason") as string) ?? ""

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { shopId: true } })
  if (!product || product.shopId !== shop.id) return { error: "Not found" }

  const result = await applyAdjustment({
    productId,
    variantId,
    shopId: shop.id,
    delta,
    type,
    reason,
    actorId: user.id,
    actorRole: "SELLER",
  })

  revalidatePath("/seller/inventory")
  revalidatePath(`/seller/inventory/${productId}`)
  return result
}

export async function adminAdjustStock(formData: FormData): Promise<{ error?: string }> {
  const admin = await assertAdmin()

  const productId = formData.get("productId") as string
  const variantId = (formData.get("variantId") as string) || null
  const delta = Number(formData.get("delta"))
  const type = formData.get("type") as StockMovementType
  const reason = (formData.get("reason") as string) ?? ""

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { shopId: true } })
  if (!product) return { error: "Not found" }

  const result = await applyAdjustment({
    productId,
    variantId,
    shopId: product.shopId,
    delta,
    type,
    reason,
    actorId: admin.id,
    actorRole: "ADMIN",
  })

  revalidatePath("/admin/inventory")
  revalidatePath(`/admin/inventory/${productId}`)
  return result
}
