export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function resolveDateRange(fromStr?: string, toStr?: string): { from: Date; to: Date } {
  const defaultTo = new Date()
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 29)

  const from = fromStr ? new Date(fromStr) : defaultFrom
  const to = toStr ? new Date(toStr) : defaultTo
  to.setHours(23, 59, 59, 999)
  return { from, to }
}
