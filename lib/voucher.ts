export interface VoucherRules {
  discountType: "PERCENT" | "FIXED"
  discountValue: number
  maxDiscount: number | null
}

export function computeVoucherDiscount(voucher: VoucherRules, subtotal: number): number {
  if (subtotal <= 0) return 0
  const raw =
    voucher.discountType === "PERCENT" ? (subtotal * voucher.discountValue) / 100 : voucher.discountValue
  const capped = voucher.maxDiscount != null ? Math.min(raw, voucher.maxDiscount) : raw
  return Math.round(Math.min(Math.max(capped, 0), subtotal) * 100) / 100
}

/** Splits `total` across `weights` proportionally, rounded to cents, with the remainder assigned to the last share so the parts always sum back to `total`. */
export function splitProportionally(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (weightSum <= 0 || total <= 0) return weights.map(() => 0)

  const shares = weights.map((w) => Math.round(((total * w) / weightSum) * 100) / 100)
  const allocated = shares.reduce((a, b) => a + b, 0)
  const diff = Math.round((total - allocated) * 100) / 100
  if (diff !== 0) {
    shares[shares.length - 1] = Math.round((shares[shares.length - 1] + diff) * 100) / 100
  }
  return shares
}
