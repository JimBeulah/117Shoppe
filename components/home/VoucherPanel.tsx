import type { VoucherItem } from "@/types"
import { VoucherCard } from "@/components/ui/VoucherCard"
import { SectionHeader } from "@/components/ui/SectionHeader"

export function VoucherPanel({ vouchers }: { vouchers: VoucherItem[] }) {
  return (
    <div className="bg-white rounded-lg p-2.5 border border-border/50 shadow-sm">
      <SectionHeader title="Vouchers" href="/vouchers" />
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[80px] scrollbar-violet">
        {vouchers.map((v) => (
          <VoucherCard key={v.id} voucher={v} />
        ))}
      </div>
    </div>
  )
}
