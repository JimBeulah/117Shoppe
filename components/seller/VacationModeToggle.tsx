"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { toggleShopVacation } from "@/lib/seller/actions"

interface Props {
  initialIsOnVacation: boolean
  initialVacationMessage: string | null
}

export default function VacationModeToggle({ initialIsOnVacation, initialVacationMessage }: Props) {
  const [isOnVacation, setIsOnVacation] = useState(initialIsOnVacation)
  const [message, setMessage] = useState(initialVacationMessage ?? "")
  const [isPending, startTransition] = useTransition()

  function handleToggle(next: boolean) {
    if (next) {
      const ok = confirm(
        "Turning on vacation mode will hide all your products from the storefront and block checkout for items already in buyers' carts. Continue?"
      )
      if (!ok) return
    }

    startTransition(async () => {
      const result = await toggleShopVacation(next, next ? message : null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setIsOnVacation(next)
      toast.success(next ? "Vacation mode enabled" : "Vacation mode disabled")
    })
  }

  return (
    <div className="bg-white rounded-lg border border-border-default p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Vacation Mode</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Temporarily hide your shop from the storefront. Your seller portal stays fully usable.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOnVacation}
          disabled={isPending}
          onClick={() => handleToggle(!isOnVacation)}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
            isOnVacation ? "bg-brand-600" : "bg-gray-300"
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              isOnVacation ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {isOnVacation && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Back-soon message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            placeholder="Back on August 25! Thanks for your patience."
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}
    </div>
  )
}
