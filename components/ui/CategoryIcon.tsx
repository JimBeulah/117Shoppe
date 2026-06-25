import Link from "next/link"
import type { CategoryItem } from "@/types"

export function CategoryIcon({ category }: { category: CategoryItem }) {
  return (
    <Link href={`/category/${category.slug}`} className="flex flex-col items-center gap-1.5 min-w-[72px] group">
      <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl group-hover:bg-brand-200 transition-colors">
        {category.icon ?? "🛍️"}
      </div>
      <span className="text-xs text-text-primary text-center leading-tight font-medium">{category.name}</span>
    </Link>
  )
}
