"use client"

import { useEffect, useState, useTransition } from "react"
import { Coins } from "lucide-react"
import { applyCoins } from "@/app/(shop)/checkout/actions"
import { formatPrice } from "@/lib/utils"

export interface AppliedCoinsState {
  coinsApplied: number
  coinDiscount: number
}

interface CoinRedeemPanelProps {
  balance: number
  voucherDiscount: number
  applied: AppliedCoinsState | null
  onApply: (state: AppliedCoinsState | null) => void
}

export function CoinRedeemPanel({ balance, voucherDiscount, applied, onApply }: CoinRedeemPanelProps) {
  const [useCoins, setUseCoins] = useState(false)
  const [maxRedeemable, setMaxRedeemable] = useState(0)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!useCoins) {
      onApply(null)
      return
    }
    startTransition(async () => {
      const result = await applyCoins(balance, voucherDiscount)
      if (result.error) return
      setMaxRedeemable(result.maxRedeemable ?? 0)
      onApply({ coinsApplied: result.coinsApplied ?? 0, coinDiscount: result.coinDiscount ?? 0 })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCoins, voucherDiscount, balance])

  if (balance <= 0) return null

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={useCoins}
            onChange={(e) => setUseCoins(e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
          <Coins className="w-4 h-4 text-amber-500" />
          Use Shoppe Coins ({balance.toLocaleString()} available)
        </label>
        {useCoins && applied && !isPending && maxRedeemable > 0 && (
          <span className="text-sm font-semibold text-green-600">-{formatPrice(applied.coinDiscount)}</span>
        )}
      </div>
      {useCoins && !isPending && maxRedeemable === 0 && (
        <p className="px-4 pb-3 text-xs text-text-secondary">Coins can&apos;t be applied to this order.</p>
      )}
    </div>
  )
}
