export default function CartLoading() {
  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="h-7 w-40 bg-bg-subtle rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-border p-4 space-y-3">
                <div className="h-4 w-32 bg-bg-subtle rounded animate-pulse" />
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex gap-3 py-3 border-b border-border last:border-0">
                    <div className="w-20 h-20 bg-bg-subtle rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-bg-subtle rounded animate-pulse" />
                      <div className="h-3 w-1/4 bg-bg-subtle rounded animate-pulse" />
                      <div className="h-4 w-1/3 bg-bg-subtle rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-border p-4 h-48 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
