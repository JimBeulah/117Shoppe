import Link from "next/link"
import Image from "next/image"
import type { CategoryItem } from "@/types"
import { CategoryPicture } from "@/components/ui/category-icons"

export function CategoryIcon({ category }: { category: CategoryItem }) {
  return (
    <Link href={`/category/${category.slug}`} className="flex flex-col items-center gap-1.5 group">
      <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors shrink-0 overflow-hidden">
        {category.imageUrl ? (
          <Image src={category.imageUrl} alt="" width={56} height={56} unoptimized className="w-full h-full object-cover" />
        ) : (
          <CategoryPicture slug={category.slug} className="w-6 h-6 text-brand-600" />
        )}
      </div>
      <span className="text-xs text-text-primary text-center leading-tight font-medium w-full">
        {category.name}
      </span>
    </Link>
  )
}
