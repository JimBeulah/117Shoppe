import { prisma } from "@/lib/db"
import { formatPrice } from "@/lib/utils"
import { computeVoucherDiscount } from "@/lib/voucher"
import type { AppliedVoucher } from "@/types"

export interface VoucherValidationResult {
  voucher?: AppliedVoucher
  discountAmount?: number
  error?: string
}

/** Looks up which shop (if any) a voucher code belongs to, without full validation. `undefined` = not found, `null` = global voucher, string = shop-scoped. */
export async function peekVoucherShopId(code: string): Promise<string | null | undefined> {
  const trimmed = code.trim()
  if (!trimmed) return undefined
  const voucher = await prisma.voucher.findFirst({
    where: { code: { equals: trimmed, mode: "insensitive" } },
    select: { shopId: true },
  })
  return voucher?.shopId
}

/**
 * Validates a voucher code against `subtotal`. For a shop-scoped voucher, `subtotal` must be
 * that shop's subtotal only (not the whole cart), and `shopId` must be passed and match the
 * voucher's shop — callers should use `peekVoucherShopId` first to determine which subtotal to pass.
 */
export async function validateVoucherCode(
  code: string,
  subtotal: number,
  shopId?: string
): Promise<VoucherValidationResult> {
  const trimmed = code.trim()
  if (!trimmed) return { error: "Enter a voucher code" }

  const voucher = await prisma.voucher.findFirst({
    where: { code: { equals: trimmed, mode: "insensitive" } },
  })
  if (!voucher) return { error: "Invalid voucher code" }
  if (!voucher.isActive) return { error: "This voucher is no longer active" }
  if (voucher.expiresAt < new Date()) return { error: "This voucher has expired" }
  if (voucher.shopId != null && voucher.shopId !== shopId) {
    return { error: "This voucher is only valid for items from its shop" }
  }
  if (subtotal < voucher.minSpend) {
    return { error: `Minimum spend of ${formatPrice(voucher.minSpend)} required` }
  }
  if (voucher.usageLimit != null) {
    const usageCount = await prisma.order.count({ where: { voucherId: voucher.id } })
    if (usageCount >= voucher.usageLimit) return { error: "This voucher has reached its usage limit" }
  }

  const discountAmount = computeVoucherDiscount(voucher, subtotal)
  if (discountAmount <= 0) return { error: "This voucher does not apply to your order" }

  return {
    voucher: {
      id: voucher.id,
      code: voucher.code,
      title: voucher.title,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscount: voucher.maxDiscount,
      shopId: voucher.shopId,
    },
    discountAmount,
  }
}
