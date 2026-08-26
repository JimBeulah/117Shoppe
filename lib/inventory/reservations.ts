import { prisma } from "@/lib/db"
import { adjustStock } from "@/lib/inventory/stock"
import { logOrderEvent } from "@/lib/orders/timeline"
import { createNotification } from "@/lib/notifications/create"
import { buildOrderStatusCopy } from "@/lib/notifications/copy"
import type { Prisma } from "@/lib/generated/prisma/client"

type TxClient = Prisma.TransactionClient | typeof prisma

/**
 * How long a stock hold survives for an order awaiting online payment
 * confirmation before it's automatically released and the order cancelled.
 * PayMongo checkout links carry no built-in expiry, so this is the only
 * backstop against stock being locked up forever by an abandoned checkout.
 */
export const RESERVATION_TTL_MINUTES = 30

/**
 * Records a hold on stock for one order item. Stock itself is decremented
 * immediately by the caller (same atomic, oversell-safe path as before) —
 * this just tracks the hold so it can be committed on payment confirmation
 * or released automatically if payment never completes.
 */
export async function createReservation(
  tx: TxClient,
  params: {
    productId: string
    variantId?: string | null
    shopId: string
    orderId: string
    quantity: number
    /** COD orders are paid at placement — commit the hold immediately. */
    committed: boolean
  }
) {
  const now = new Date()
  return tx.stockReservation.create({
    data: {
      productId: params.productId,
      variantId: params.variantId ?? null,
      shopId: params.shopId,
      orderId: params.orderId,
      quantity: params.quantity,
      status: params.committed ? "COMMITTED" : "HELD",
      expiresAt: params.committed ? now : new Date(now.getTime() + RESERVATION_TTL_MINUTES * 60_000),
    },
  })
}

/** Marks all held reservations for an order as committed once payment clears. */
export async function commitReservationsForOrder(tx: TxClient, orderId: string) {
  await tx.stockReservation.updateMany({
    where: { orderId, status: "HELD" },
    data: { status: "COMMITTED" },
  })
}

/**
 * Marks held reservations for an order as released without touching stock —
 * used when an order is cancelled through the normal cancel flow, which
 * already restocks via its own StockMovement. This just keeps the
 * reservation ledger from showing stale HELD rows for a dead order.
 */
export async function releaseReservationsForOrder(tx: TxClient, orderId: string) {
  await tx.stockReservation.updateMany({
    where: { orderId, status: "HELD" },
    data: { status: "RELEASED" },
  })
}

/**
 * Scope for a sweep: either a single order being read (order-detail pages),
 * or the set of products a caller is about to check availability for
 * (checkout, before validating stock — an expired hold on any of these
 * products, from any user's abandoned order, should be freed first).
 * Either way this stays bounded and never scans the whole reservation table.
 */
type SweepScope = { orderId: string } | { productIds: string[] }

/**
 * Sweeps reservations whose hold window has lapsed with no payment
 * confirmation: restocks the held quantity, cancels the still-PENDING
 * order(s), and marks the reservations EXPIRED. Called lazily from order
 * read paths and checkout, scoped per-call so it never scans other shops'
 * unrelated reservations, mirroring escalateExpiredReturnRequests.
 */
export async function releaseExpiredReservations(scope: SweepScope) {
  const where =
    "orderId" in scope
      ? { orderId: scope.orderId, status: "HELD" as const, expiresAt: { lt: new Date() } }
      : { productId: { in: scope.productIds }, status: "HELD" as const, expiresAt: { lt: new Date() } }

  const expired = await prisma.stockReservation.findMany({
    where,
    select: { id: true, orderId: true, productId: true, variantId: true, shopId: true, quantity: true },
  })
  if (expired.length === 0) return

  const orderIds = Array.from(new Set(expired.map((r) => r.orderId)))
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, status: true, userId: true },
  })
  const orderMap = new Map(orders.map((o) => [o.id, o]))

  for (const orderId of orderIds) {
    const order = orderMap.get(orderId)
    if (!order) continue

    if (order.status !== "PENDING") {
      // Already paid, cancelled, or otherwise resolved by other means — just
      // clear the stale holds without touching stock a second time.
      await prisma.stockReservation.updateMany({
        where: { orderId, status: "HELD" },
        data: { status: "RELEASED" },
      })
      continue
    }

    const items = expired.filter((r) => r.orderId === orderId)

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } })
      for (const item of items) {
        await adjustStock(tx, {
          productId: item.productId,
          variantId: item.variantId,
          shopId: item.shopId,
          delta: item.quantity,
          type: "RESERVATION_EXPIRED_RESTOCK",
          orderId,
        })
      }
      await tx.stockReservation.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: { status: "EXPIRED" },
      })
      await logOrderEvent(tx, {
        orderId,
        type: "ORDER_CANCELLED",
        message: "Order automatically cancelled — payment was not completed in time.",
      })
    })

    const copy = buildOrderStatusCopy(orderId, "CANCELLED")
    if (copy) await createNotification({ userId: order.userId, ...copy })
  }
}
