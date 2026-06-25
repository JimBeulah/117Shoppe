import type { VoucherItem } from "@/types"
import { formatPrice } from "@/lib/utils"

export function VoucherCard({ voucher }: { voucher: VoucherItem }) {
  const discount =
    voucher.discountType === "FIXED"
      ? `${formatPrice(voucher.discountValue)} Off`
      : `${voucher.discountValue}% Off`

  return (
    <div className="flex rounded-lg overflow-hidden border border-brand-100 bg-white shadow-sm min-w-[200px]">
      <div className="bg-brand-600 text-white flex flex-col items-center justify-center px-4 py-3 min-w-[80px]">
        <span className="text-xs font-medium opacity-80">Save</span>
        <span className="text-sm font-bold leading-tight text-center">{discount}</span>
      </div>
      <div className="flex flex-col justify-center px-3 py-2 flex-1">
        <p className="text-xs font-semibold text-text-primary leading-tight">{voucher.title}</p>
        {voucher.minSpend > 0 && (
          <p className="text-[10px] text-text-secondary mt-0.5">Min. spend {formatPrice(voucher.minSpend)}</p>
        )}
        <button className="mt-1.5 text-[10px] font-bold text-brand-600 border border-brand-600 rounded px-2 py-0.5 hover:bg-brand-50 transition-colors self-start">
          Claim
        </button>
      </div>
    </div>
  )
}
