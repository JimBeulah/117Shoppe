import type { VoucherItem } from "@/types"
import { VoucherCard } from "@/components/ui/VoucherCard"
import { SectionHeader } from "@/components/ui/SectionHeader"

export function VoucherPanel({ vouchers }: { vouchers: VoucherItem[] }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-border/50 shadow-sm">
      <SectionHeader title="Vouchers" href="/vouchers" />
      <div className="flex flex-col gap-3 overflow-y-auto max-h-[180px] scrollbar-hide">
        {vouchers.map((v) => (
          <VoucherCard key={v.id} voucher={v} />
        ))}
      </div>
    </div>
  )
}
