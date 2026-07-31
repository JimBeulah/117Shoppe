export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="max-w-md w-full text-center space-y-4 p-8 bg-white rounded-lg border border-border-default">
        <div className="text-5xl">⏳</div>
        <h1 className="text-xl font-bold text-text-primary">Your shop is under review</h1>
        <p className="text-sm text-text-secondary">
          We&apos;re reviewing your application. This usually takes 1–2 business days.
          You&apos;ll get access to your seller dashboard once approved.
        </p>
        <p className="text-xs text-text-secondary">
          Questions?{" "}
          <a href="mailto:support@shoppe.com" className="text-brand-600 hover:underline">
            support@shoppe.com
          </a>
        </p>
      </div>
    </div>
  )
}
