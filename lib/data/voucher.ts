import { prisma } from "@/lib/db"
import { formatPrice } from "@/lib/utils"
import { computeVoucherDiscount } from "@/lib/voucher"
import type { AppliedVoucher } from "@/types"

export interface VoucherValidationResult {
  voucher?: AppliedVoucher
  discountAmount?: number
  error?: string
}

export async function validateVoucherCode(code: string, subtotal: number): Promise<VoucherValidationResult> {
  const trimmed = code.trim()
  if (!trimmed) return { error: "Enter a voucher code" }

  const voucher = await prisma.voucher.findFirst({
    where: { code: { equals: trimmed, mode: "insensitive" } },
  })
  if (!voucher) return { error: "Invalid voucher code" }
  if (!voucher.isActive) return { error: "This voucher is no longer active" }
  if (voucher.expiresAt < new Date()) return { error: "This voucher has expired" }
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
    },
    discountAmount,
  }
}
