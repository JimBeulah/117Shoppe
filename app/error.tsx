"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <p className="text-6xl font-bold text-accent-sale">!</p>
      <h1 className="text-2xl font-semibold text-text-primary">Something went wrong</h1>
      <button onClick={reset} className="bg-brand-600 text-white px-6 py-2 rounded-full hover:bg-brand-700 transition-colors">
        Try again
      </button>
    </div>
  )
}
