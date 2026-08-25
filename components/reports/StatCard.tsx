interface Props {
  label: string
  value: string
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="bg-white rounded-lg border border-border-default p-5">
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
    </div>
  )
}
