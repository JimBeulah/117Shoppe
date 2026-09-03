import { prisma } from "@/lib/db"
import { COIN_EXPIRY_DAYS } from "@/lib/coins/config"
import type { Prisma, CoinType } from "@/lib/generated/prisma/client"

type TxClient = Prisma.TransactionClient | typeof prisma

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

/**
 * Adds a live (spendable) batch to a user's coin balance — used for both
 * EARNED accrual and REFUNDED reversals. Batch carries its own expiry so a
 * refunded batch gets a fresh window rather than inheriting the original's.
 */
export async function grantCoins(
  tx: TxClient,
  params: {
    userId: string
    coins: number
    type: Extract<CoinType, "EARNED" | "REFUNDED">
    orderId?: string | null
    description?: string
    expiresInDays?: number
  }
) {
  if (params.coins <= 0) return null

  await tx.user.update({ where: { id: params.userId }, data: { coins: { increment: params.coins } } })
  return tx.coin.create({
    data: {
      userId: params.userId,
      amount: params.coins,
      remaining: params.coins,
      type: params.type,
      orderId: params.orderId ?? null,
      description: params.description,
      expiresAt: addDays(params.expiresInDays ?? COIN_EXPIRY_DAYS),
    },
  })
}

/** Draws `amount` off the user's live batches FIFO (oldest expiry first). Caller guarantees `amount` fits within the current balance. */
async function drawDownBatches(tx: TxClient, userId: string, amount: number) {
  const batches = await tx.coin.findMany({
    where: { userId, remaining: { gt: 0 }, type: { in: ["EARNED", "REFUNDED"] } },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, remaining: true },
  })

  let toDraw = amount
  for (const batch of batches) {
    if (toDraw <= 0) break
    const draw = Math.min(batch.remaining, toDraw)
    await tx.coin.update({ where: { id: batch.id }, data: { remaining: { decrement: draw } } })
    toDraw -= draw
  }
}

/**
 * Spends coins FIFO across the user's live batches, matching the
 * oversell-safe conditional-update idiom used for stock in
 * checkout/actions.ts — the balance guard is a single atomic updateMany.
 */
export async function spendCoins(
  tx: TxClient,
  params: { userId: string; coins: number; orderId?: string | null; description?: string }
) {
  if (params.coins <= 0) return

  const result = await tx.user.updateMany({
    where: { id: params.userId, coins: { gte: params.coins } },
    data: { coins: { decrement: params.coins } },
  })
  if (result.count === 0) throw new Error("Not enough coins to redeem.")

  await drawDownBatches(tx, params.userId, params.coins)

  await tx.coin.create({
    data: {
      userId: params.userId,
      amount: params.coins,
      remaining: 0,
      type: "SPENT",
      orderId: params.orderId ?? null,
      description: params.description,
    },
  })
}

/**
 * Reverses previously accrued coins on refund/cancel — clamped to whatever
 * balance remains, since the buyer may have already spent them. Never throws
 * and never drives the balance negative.
 */
export async function clawbackCoins(
  tx: TxClient,
  params: { userId: string; coins: number; orderId?: string | null; description?: string }
) {
  if (params.coins <= 0) return

  const user = await tx.user.findUnique({ where: { id: params.userId }, select: { coins: true } })
  const toClaw = Math.min(params.coins, user?.coins ?? 0)
  if (toClaw <= 0) return

  await tx.user.update({ where: { id: params.userId }, data: { coins: { decrement: toClaw } } })
  await drawDownBatches(tx, params.userId, toClaw)

  await tx.coin.create({
    data: {
      userId: params.userId,
      amount: toClaw,
      remaining: 0,
      type: "SPENT",
      orderId: params.orderId ?? null,
      description: params.description,
    },
  })
}

/**
 * Lazily expires lapsed batches for one user — bounded to that user, mirroring
 * releaseExpiredReservations / escalateExpiredReturnRequests. Called from the
 * coins page and before computing spendable balance at checkout.
 */
export async function expireCoins(params: { userId: string }) {
  const expired = await prisma.coin.findMany({
    where: {
      userId: params.userId,
      remaining: { gt: 0 },
      type: { in: ["EARNED", "REFUNDED"] },
      expiresAt: { lt: new Date() },
    },
    select: { id: true, remaining: true },
  })
  if (expired.length === 0) return

  const total = expired.reduce((sum, b) => sum + b.remaining, 0)

  await prisma.$transaction(async (tx) => {
    for (const batch of expired) {
      await tx.coin.update({ where: { id: batch.id }, data: { remaining: 0 } })
    }
    await tx.user.updateMany({
      where: { id: params.userId, coins: { gte: total } },
      data: { coins: { decrement: total } },
    })
    await tx.coin.create({
      data: {
        userId: params.userId,
        amount: total,
        remaining: 0,
        type: "EXPIRED",
        description: "Coins expired",
      },
    })
  })
}
