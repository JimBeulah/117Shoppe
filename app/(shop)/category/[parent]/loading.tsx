export default function CategoryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 animate-pulse">
      <div className="h-4 w-48 bg-brand-100 rounded mb-3" />
      <div className="h-7 w-40 bg-brand-100 rounded mb-4" />
      <div className="h-10 bg-brand-50 rounded mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <div className="hidden lg:block space-y-3">
          <div className="h-4 w-20 bg-brand-100 rounded" />
          <div className="h-8 bg-brand-50 rounded" />
          <div className="h-8 bg-brand-50 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-brand-50 rounded-lg aspect-square" />
          ))}
        </div>
      </div>
    </div>
  )
}
