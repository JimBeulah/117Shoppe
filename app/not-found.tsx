import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="text-2xl font-semibold text-text-primary">Page not found</h1>
      <p className="text-text-secondary">Sorry, we couldn't find the page you're looking for.</p>
      <Link href="/" className="bg-brand-600 text-white px-6 py-2 rounded-full hover:bg-brand-700 transition-colors">
        Back to Home
      </Link>
    </div>
  )
}
