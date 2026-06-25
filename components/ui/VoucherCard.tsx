import type { VoucherItem } from "@/types"
import { formatPrice } from "@/lib/utils"

export function VoucherCard({ voucher }: { voucher: VoucherItem }) {
  const discount =
    voucher.discountType === "FIXED"
      ? `${formatPrice(voucher.discountValue)} Off`
      : `${voucher.discountValue}% Off`

  return (
    <div className="relative flex rounded-lg border border-brand-100 bg-white shadow-sm min-w-[200px] shrink-0 h-20 overflow-hidden">
      {/* Left Block - Discount Badge */}
      <div className="bg-brand-600 text-white flex flex-col items-center justify-center px-3 min-w-[80px] h-full select-none">
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-90">Save</span>
        <span className="text-sm font-extrabold leading-tight text-center whitespace-nowrap mt-0.5">{discount}</span>
      </div>

      {/* Ticket Scallop Divider */}
      <div className="relative w-3 h-full flex flex-col justify-between items-center -mx-1.5 z-10 shrink-0">
        <div className="w-3 h-3 rounded-full bg-bg-page border border-brand-100 -mt-1.5" />
        <div className="w-0.5 h-10 border-l border-dashed border-brand-200" />
        <div className="w-3 h-3 rounded-full bg-bg-page border border-brand-100 -mb-1.5" />
      </div>

      {/* Right Block - Details */}
      <div className="flex flex-col justify-center pl-4 pr-3 py-2 flex-1 h-full min-w-0">
        <p className="text-xs font-bold text-text-primary truncate leading-snug">{voucher.title}</p>
        {voucher.minSpend > 0 ? (
          <p className="text-[9px] font-medium text-text-secondary mt-0.5">Min. spend {formatPrice(voucher.minSpend)}</p>
        ) : (
          <p className="text-[9px] font-medium text-success mt-0.5">No min. spend</p>
        )}
        <button className="mt-1.5 text-[9px] font-bold text-brand-600 border border-brand-200 rounded-full px-3 py-0.5 hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all self-start shadow-sm active:scale-95 cursor-pointer">
          Claim
        </button>
      </div>
    </div>
  )
}
