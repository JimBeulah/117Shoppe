export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 animate-pulse">
      <div className="h-4 w-64 bg-brand-100 rounded mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div>
          <div className="aspect-square w-full bg-brand-50 rounded-lg mb-3" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-16 h-16 bg-brand-50 rounded" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-7 bg-brand-100 rounded w-3/4" />
          <div className="h-4 bg-brand-50 rounded w-1/2" />
          <div className="h-8 bg-brand-100 rounded w-1/3" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-16 bg-brand-50 rounded" />
            ))}
          </div>
          <div className="h-12 bg-brand-100 rounded" />
          <div className="h-20 bg-brand-50 rounded" />
        </div>
      </div>
    </div>
  )
}
