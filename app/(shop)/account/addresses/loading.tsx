export default function AddressesLoading() {
  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-7 w-36 bg-bg-subtle rounded animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-border p-4 h-20 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
