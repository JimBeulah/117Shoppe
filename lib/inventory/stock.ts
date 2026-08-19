import { prisma } from "@/lib/db"
import type { Prisma, StockMovementType, Role } from "@/lib/generated/prisma/client"

type TxClient = Prisma.TransactionClient | typeof prisma

export async function logStockMovement(
  tx: TxClient,
  params: {
    productId: string
    variantId?: string | null
    shopId: string
    type: StockMovementType
    delta: number
    quantityBefore: number
    quantityAfter: number
    reason?: string | null
    orderId?: string | null
    actorId?: string | null
    actorRole?: Role | null
    metadata?: Record<string, unknown>
  }
) {
  return tx.stockMovement.create({
    data: {
      productId: params.productId,
      variantId: params.variantId ?? null,
      shopId: params.shopId,
      type: params.type,
      delta: params.delta,
      quantityBefore: params.quantityBefore,
      quantityAfter: params.quantityAfter,
      reason: params.reason ?? null,
      orderId: params.orderId ?? null,
      actorId: params.actorId ?? null,
      actorRole: params.actorRole ?? null,
      metadata: params.metadata as Prisma.InputJsonValue,
    },
  })
}

/**
 * Atomically applies a signed stock change to a Product or ProductVariant and
 * records it as a StockMovement, all within the caller's transaction. Reuses
 * the `updateMany` + `gte` guard idiom from checkout to stay oversell-safe on
 * decrements. Throws if a decrement would take stock below zero (a lost race
 * or an invalid adjustment).
 */
export async function adjustStock(
  tx: TxClient,
  params: {
    productId: string
    variantId?: string | null
    shopId: string
    delta: number
    type: StockMovementType
    reason?: string | null
    orderId?: string | null
    actorId?: string | null
    actorRole?: Role | null
    metadata?: Record<string, unknown>
  }
) {
  const { productId, variantId, delta } = params

  if (variantId) {
    const before = await tx.productVariant.findUniqueOrThrow({
      where: { id: variantId },
      select: { stock: true },
    })
    if (delta < 0) {
      const result = await tx.productVariant.updateMany({
        where: { id: variantId, stock: { gte: -delta } },
        data: { stock: { decrement: -delta } },
      })
      if (result.count === 0) {
        throw new Error("Not enough stock available for this variant.")
      }
    } else if (delta > 0) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: delta } },
      })
    }
    const quantityAfter = before.stock + delta

    return logStockMovement(tx, {
      ...params,
      quantityBefore: before.stock,
      quantityAfter,
    })
  }

  const before = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { stock: true },
  })
  if (delta < 0) {
    const result = await tx.product.updateMany({
      where: { id: productId, stock: { gte: -delta } },
      data: { stock: { decrement: -delta } },
    })
    if (result.count === 0) {
      throw new Error("Not enough stock available for this product.")
    }
  } else if (delta > 0) {
    await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: delta } },
    })
  }
  const quantityAfter = before.stock + delta

  return logStockMovement(tx, {
    ...params,
    quantityBefore: before.stock,
    quantityAfter,
  })
}
