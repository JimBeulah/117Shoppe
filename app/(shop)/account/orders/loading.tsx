export default function OrdersLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-border-default rounded-lg h-40 animate-pulse" />
      ))}
    </div>
  )
}
