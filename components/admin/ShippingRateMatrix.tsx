"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { upsertShippingRate } from "@/lib/admin/actions"
import type { AdminShippingMethodRow, AdminShippingRateRow, AdminShippingZoneRow } from "@/types/admin"

interface Props {
  methods: AdminShippingMethodRow[]
  zones: AdminShippingZoneRow[]
  rates: AdminShippingRateRow[]
}

export function ShippingRateMatrix({ methods, zones, rates }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingCell, setPendingCell] = useState<string | null>(null)

  const rateFor = (methodId: string, zoneId: string) =>
    rates.find((r) => r.methodId === methodId && r.zoneId === zoneId)

  if (methods.length === 0 || zones.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border-default p-5 text-sm text-text-secondary">
        Add at least one method and one zone to configure rates.
      </div>
    )
  }

  function handleSave(methodId: string, zoneId: string, form: HTMLFormElement) {
    const fd = new FormData(form)
    const price = Number(fd.get("price"))
    const daysMin = Number(fd.get("daysMin"))
    const daysMax = Number(fd.get("daysMax"))
    setPendingCell(`${methodId}:${zoneId}`)
    startTransition(async () => {
      const result = await upsertShippingRate(methodId, zoneId, price, daysMin, daysMax)
      setPendingCell(null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Rate saved")
    })
  }

  return (
    <div className="bg-white rounded-lg border border-border-default overflow-x-auto">
      <table className="text-sm min-w-full">
        <thead className="border-b border-border-default bg-bg-page">
          <tr>
            <th className="text-left px-4 py-3 text-text-secondary font-medium sticky left-0 bg-bg-page">Zone \ Method</th>
            {methods.map((m) => (
              <th key={m.id} className="text-left px-4 py-3 text-text-secondary font-medium whitespace-nowrap">
                {m.name} ({m.carrier})
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {zones.map((zone) => (
            <tr key={zone.id}>
              <td className="px-4 py-3 font-medium text-text-primary sticky left-0 bg-white whitespace-nowrap">
                {zone.name}
              </td>
              {methods.map((method) => {
                const rate = rateFor(method.id, zone.id)
                const cellKey = `${method.id}:${zone.id}`
                return (
                  <td key={method.id} className="px-4 py-3">
                    <form
                      className="flex items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSave(method.id, zone.id, e.currentTarget)
                      }}
                    >
                      <span className="text-xs text-text-secondary">₱</span>
                      <input
                        name="price"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={rate?.price ?? ""}
                        placeholder="—"
                        className="w-16 text-sm border border-border-default rounded px-1.5 py-1"
                      />
                      <input
                        name="daysMin"
                        type="number"
                        min={1}
                        defaultValue={rate?.estimatedDaysMin ?? ""}
                        placeholder="min"
                        className="w-12 text-sm border border-border-default rounded px-1.5 py-1"
                      />
                      <span className="text-xs text-text-secondary">–</span>
                      <input
                        name="daysMax"
                        type="number"
                        min={1}
                        defaultValue={rate?.estimatedDaysMax ?? ""}
                        placeholder="max"
                        className="w-12 text-sm border border-border-default rounded px-1.5 py-1"
                      />
                      <span className="text-xs text-text-secondary">d</span>
                      <button
                        type="submit"
                        disabled={isPending && pendingCell === cellKey}
                        className="text-xs text-brand-600 hover:underline disabled:opacity-50 ml-1"
                      >
                        {isPending && pendingCell === cellKey ? "…" : "Save"}
                      </button>
                    </form>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
