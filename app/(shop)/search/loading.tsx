export default function SearchLoading() {
  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="h-7 w-64 bg-border rounded animate-pulse mb-1" />
        <div className="h-4 w-32 bg-border rounded animate-pulse mb-3" />
        <div className="h-10 w-full bg-border rounded animate-pulse mb-4" />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block space-y-3">
            <div className="h-5 w-24 bg-border rounded animate-pulse" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-full bg-border rounded animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-border rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
