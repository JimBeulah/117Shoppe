const TYPE_LABELS: Record<string, string> = {
  SALE: "Sale",
  CANCELLATION_RESTOCK: "Cancellation Restock",
  REFUND_RESTOCK: "Refund Restock",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
  RESTOCK_IN: "Restock In",
}

interface MovementEntry {
  id: string
  type: string
  delta: number
  quantityBefore: number
  quantityAfter: number
  reason: string | null
  variant: { name: string } | null
  actor: { name: string } | null
  actorRole: string | null
  createdAt: Date | string
}

interface Props {
  movements: MovementEntry[]
}

export function StockMovementTimeline({ movements }: Props) {
  if (movements.length === 0) {
    return <p className="text-sm text-text-secondary">No stock movements recorded yet.</p>
  }

  return (
    <ol className="space-y-4">
      {movements.map((m, i) => {
        const isLast = i === movements.length - 1
        const isNegative = m.delta < 0
        return (
          <li key={m.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                  isNegative ? "bg-red-500" : "bg-green-600"
                }`}
              />
              {!isLast && <div className="w-px flex-1 bg-border-default mt-1" />}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium text-text-primary">
                {TYPE_LABELS[m.type] ?? m.type}
                {m.variant && <span className="text-text-secondary font-normal"> · {m.variant.name}</span>}
              </p>
              <p className={`text-sm font-mono ${isNegative ? "text-red-600" : "text-green-700"}`}>
                {isNegative ? "" : "+"}
                {m.delta} ({m.quantityBefore} → {m.quantityAfter})
              </p>
              {m.reason && <p className="text-sm text-text-secondary">{m.reason}</p>}
              <p className="text-xs text-text-secondary mt-0.5">
                {new Date(m.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                {m.actor ? ` · ${m.actor.name}` : ""}
                {m.actorRole ? ` (${m.actorRole.charAt(0)}${m.actorRole.slice(1).toLowerCase()})` : ""}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
