"use client"

import { useEffect, useState, useTransition } from "react"
import { resumePayment } from "@/app/(shop)/account/orders/actions"

interface Props {
  orderId: string
  expiresAt: string | Date
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function PaymentCountdown({ orderId, expiresAt }: Props) {
  const target = new Date(expiresAt).getTime()
  const [remaining, setRemaining] = useState(() => target - Date.now())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  useEffect(() => {
    const interval = setInterval(() => setRemaining(target - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [target])

  const expired = remaining <= 0

  function handleResume() {
    setError("")
    startTransition(async () => {
      const result = await resumePayment(orderId)
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }
      setError(result.error ?? "Failed to resume payment")
    })
  }

  return (
    <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
      <p className="text-sm font-medium text-yellow-800">
        {expired
          ? "Payment window expired — this order will be cancelled shortly."
          : `Complete payment within ${formatRemaining(remaining)} or this order will be automatically cancelled and the stock released.`}
      </p>
      {!expired && (
        <button
          onClick={handleResume}
          disabled={isPending}
          className="text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded px-4 py-2"
        >
          {isPending ? "Redirecting…" : "Complete Payment"}
        </button>
      )}
      {error && <p className="text-xs text-accent-sale">{error}</p>}
    </section>
  )
}
