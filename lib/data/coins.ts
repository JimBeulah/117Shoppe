import { cache } from "react"
import { prisma } from "@/lib/db"
import { expireCoins } from "@/lib/coins/ledger"

const COIN_LEDGER_PAGE_SIZE = 20

export const getCoinBalance = cache(async (userId: string) => {
  await expireCoins({ userId })

  const [user, expiringSoon] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    prisma.coin.aggregate({
      where: {
        userId,
        remaining: { gt: 0 },
        type: { in: ["EARNED", "REFUNDED"] },
        expiresAt: { lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { remaining: true },
    }),
  ])

  return { balance: user?.coins ?? 0, expiringSoon: expiringSoon._sum.remaining ?? 0 }
})

export const getCoinLedger = cache(async (userId: string, page = 1) => {
  const [items, total] = await Promise.all([
    prisma.coin.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * COIN_LEDGER_PAGE_SIZE,
      take: COIN_LEDGER_PAGE_SIZE,
      select: { id: true, amount: true, type: true, description: true, orderId: true, createdAt: true },
    }),
    prisma.coin.count({ where: { userId } }),
  ])
  return { items, total, pageSize: COIN_LEDGER_PAGE_SIZE }
})
