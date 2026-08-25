import { toDateInputValue } from "@/lib/reports/dates"

interface Props {
  from: Date
  to: Date
}

export function DateRangeForm({ from, to }: Props) {
  return (
    <form className="flex items-center gap-2">
      <input
        type="date"
        name="from"
        defaultValue={toDateInputValue(from)}
        className="text-sm border border-border-default rounded px-3 py-2"
      />
      <span className="text-text-secondary text-sm">to</span>
      <input
        type="date"
        name="to"
        defaultValue={toDateInputValue(to)}
        className="text-sm border border-border-default rounded px-3 py-2"
      />
      <button
        type="submit"
        className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
      >
        Apply
      </button>
    </form>
  )
}
