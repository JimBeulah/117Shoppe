export default function HomeLoading() {
  return (
    <div className="bg-bg-page animate-pulse">
      {/* Category bar skeleton */}
      <div className="bg-white border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
              <div className="w-14 h-14 rounded-full bg-brand-100" />
              <div className="w-12 h-3 bg-brand-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Hero skeleton */}
        <div className="w-full aspect-[3/1] bg-brand-100 rounded-lg" />

        {/* Flash sale skeleton */}
        <div className="bg-white rounded-lg p-4">
          <div className="h-6 w-40 bg-brand-100 rounded mb-4" />
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="min-w-[160px] aspect-square bg-brand-100 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Trending skeleton */}
        <div className="bg-white rounded-lg p-4">
          <div className="h-6 w-48 bg-brand-100 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square bg-brand-100 rounded-lg mb-2" />
                <div className="h-3 bg-brand-100 rounded w-3/4 mb-1" />
                <div className="h-3 bg-brand-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
