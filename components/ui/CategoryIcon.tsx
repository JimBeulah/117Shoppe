import Link from "next/link"
import type { CategoryItem } from "@/types"

export function CategoryIcon({ category }: { category: CategoryItem }) {
  return (
    <Link href={`/category/${category.slug}`} className="flex flex-col items-center gap-1.5 group">
      <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl group-hover:bg-brand-200 transition-colors shrink-0">
        {category.icon ?? "🛍️"}
      </div>
      <span className="text-xs text-text-primary text-center leading-tight font-medium w-full">
        {category.name}
      </span>
    </Link>
  )
}
