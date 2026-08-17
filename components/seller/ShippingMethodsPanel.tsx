"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { toggleShopShippingMethod } from "@/lib/seller/actions"

interface MethodRow {
  id: string
  name: string
  carrier: string
  description: string | null
  isEnabled: boolean
}

export default function ShippingMethodsPanel({ methods }: { methods: MethodRow[] }) {
  const [state, setState] = useState(methods)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleToggle(methodId: string, next: boolean) {
    setPendingId(methodId)
    startTransition(async () => {
      const result = await toggleShopShippingMethod(methodId, next)
      setPendingId(null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setState((prev) => prev.map((m) => (m.id === methodId ? { ...m, isEnabled: next } : m)))
      toast.success(next ? "Method enabled" : "Method disabled")
    })
  }

  return (
    <div className="bg-white rounded-lg border border-border-default p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Shipping Methods</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Enable the couriers you can fulfill with. Buyers will only see enabled methods at checkout.
        </p>
      </div>

      {state.length === 0 && (
        <p className="text-sm text-text-secondary">No shipping methods are configured on the platform yet.</p>
      )}

      <div className="divide-y divide-border-default">
        {state.map((method) => (
          <div key={method.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {method.name} <span className="text-text-secondary font-normal">— {method.carrier}</span>
              </p>
              {method.description && <p className="text-xs text-text-secondary mt-0.5">{method.description}</p>}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={method.isEnabled}
              disabled={isPending && pendingId === method.id}
              onClick={() => handleToggle(method.id, !method.isEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                method.isEnabled ? "bg-brand-600" : "bg-gray-300"
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  method.isEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
