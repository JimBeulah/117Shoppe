"use client"

import { useState, useTransition } from "react"
import { Ticket, X } from "lucide-react"
import { applyVoucher } from "@/app/(shop)/checkout/actions"
import { formatPrice } from "@/lib/utils"
import type { AppliedVoucher } from "@/types"

export interface AppliedVoucherState {
  voucher: AppliedVoucher
  discountAmount: number
}

interface VoucherInputProps {
  applied: AppliedVoucherState | null
  onApply: (state: AppliedVoucherState) => void
  onRemove: () => void
}

export function VoucherInput({ applied, onApply, onRemove }: VoucherInputProps) {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleApply() {
    if (!code.trim()) {
      setError("Enter a voucher code")
      return
    }
    setError("")
    startTransition(async () => {
      const result = await applyVoucher(code)
      if (result.error || !result.voucher || result.discountAmount == null) {
        setError(result.error ?? "Invalid voucher code")
        return
      }
      onApply({ voucher: result.voucher, discountAmount: result.discountAmount })
      setCode("")
    })
  }

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-bg-subtle">
        <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-brand-600" />
          Voucher
        </p>
      </div>

      <div className="p-4">
        {applied ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-brand-300 bg-brand-50">
            <div>
              <p className="text-sm font-semibold text-text-primary">{applied.voucher.code}</p>
              <p className="text-xs text-text-secondary">
                {applied.voucher.title} · -{formatPrice(applied.discountAmount)}
              </p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="text-text-secondary hover:text-accent-sale transition-colors"
              aria-label="Remove voucher"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleApply()
                }
              }}
              placeholder="Enter voucher code"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
            >
              {isPending ? "Applying…" : "Apply"}
            </button>
          </div>
        )}
        {error && <p className="text-xs text-accent-sale mt-2">{error}</p>}
      </div>
    </div>
  )
}
