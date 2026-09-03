import { prisma } from "@/lib/db"
import { computeEarnedCoins } from "@/lib/coins"
import { grantCoins } from "@/lib/coins/ledger"
import type { Prisma } from "@/lib/generated/prisma/client"

type TxClient = Prisma.TransactionClient | typeof prisma

/**
 * Credits cashback coins for a delivered order. Both buyer-confirmed and
 * seller-confirmed delivery paths call this, so it checks for an existing
 * EARNED batch first rather than relying on the unique constraint — a
 * caught constraint violation would otherwise poison the surrounding
 * Postgres transaction.
 */
/** Returns the number of coins credited, or 0 if already accrued or nothing to earn. */
export async function accrueCoinsForOrder(
  tx: TxClient,
  order: { id: string; userId: string; total: number; shippingFee: number }
): Promise<number> {
  const existing = await tx.coin.findFirst({
    where: { userId: order.userId, orderId: order.id, type: "EARNED" },
    select: { id: true },
  })
  if (existing) return 0

  const merchandisePaid = order.total - order.shippingFee
  const coins = computeEarnedCoins(merchandisePaid)
  if (coins <= 0) return 0

  await grantCoins(tx, {
    userId: order.userId,
    coins,
    type: "EARNED",
    orderId: order.id,
    description: "Cashback from order",
  })
  return coins
}
