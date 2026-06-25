import Link from "next/link"

export function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="relative">
        <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide">{title}</h2>
        <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-brand-600 rounded" />
      </div>
      {href && (
        <Link href={href} className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
          View All →
        </Link>
      )}
    </div>
  )
}
