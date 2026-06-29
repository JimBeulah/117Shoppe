export default function ShopLoading() {
  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header skeleton */}
        <div className="rounded-lg overflow-hidden border border-border bg-white mb-6">
          <div className="h-40 bg-border animate-pulse" />
          <div className="px-5 pb-4">
            <div className="flex items-end gap-4 -mt-9 mb-3">
              <div className="w-[72px] h-[72px] rounded-full bg-border animate-pulse border-4 border-white flex-shrink-0" />
              <div className="flex-1 pt-10 space-y-2">
                <div className="h-5 w-40 bg-border rounded animate-pulse" />
                <div className="h-3 w-56 bg-border rounded animate-pulse" />
              </div>
              <div className="pt-10">
                <div className="h-8 w-24 bg-border rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Sort bar skeleton */}
        <div className="h-10 w-full bg-border rounded animate-pulse mb-4" />

        {/* Grid skeleton */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block space-y-3">
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
