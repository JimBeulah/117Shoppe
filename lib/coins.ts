import { COIN_TO_PESO, COIN_EARN_RATE, COIN_EARN_CAP_PER_ORDER, MAX_COIN_DISCOUNT_PCT } from "@/lib/coins/config"

export function coinsToPeso(coins: number): number {
  return Math.round(coins * COIN_TO_PESO * 100) / 100
}

/** Floors so a redemption or accrual never mints peso value out of rounding. */
export function pesoToCoins(peso: number): number {
  return Math.floor(peso / COIN_TO_PESO)
}

export function maxRedeemableCoins(balance: number, discountableSubtotal: number): number {
  if (balance <= 0 || discountableSubtotal <= 0) return 0
  return Math.min(balance, pesoToCoins(discountableSubtotal * MAX_COIN_DISCOUNT_PCT))
}

export function computeEarnedCoins(merchandisePaid: number): number {
  if (merchandisePaid <= 0) return 0
  return Math.min(pesoToCoins(merchandisePaid * COIN_EARN_RATE), COIN_EARN_CAP_PER_ORDER)
}

/** Integer largest-remainder split of `coins` across `weights` — shares always sum back to `coins`. */
export function splitCoinsProportionally(coins: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (weightSum <= 0 || coins <= 0) return weights.map(() => 0)

  const raw = weights.map((w) => (coins * w) / weightSum)
  const shares = raw.map(Math.floor)
  let remainder = coins - shares.reduce((a, b) => a + b, 0)

  const order = raw
    .map((value, i) => ({ i, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)

  for (const { i } of order) {
    if (remainder <= 0) break
    shares[i] += 1
    remainder -= 1
  }

  return shares
}
