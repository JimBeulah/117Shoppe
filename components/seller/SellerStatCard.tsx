interface Props {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export default function SellerStatCard({ label, value, sub, highlight }: Props) {
  return (
    <div
      className={`bg-white rounded-lg border p-5 space-y-1 ${
        highlight ? "border-brand-200 bg-brand-50" : "border-border-default"
      }`}
    >
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-brand-700" : "text-text-primary"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  )
}
