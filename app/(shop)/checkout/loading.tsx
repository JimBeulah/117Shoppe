export default function CheckoutLoading() {
  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="h-7 w-32 bg-bg-subtle rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-border h-48 animate-pulse" />
            <div className="bg-white rounded-lg border border-border h-64 animate-pulse" />
          </div>
          <div className="bg-white rounded-lg border border-border h-48 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
