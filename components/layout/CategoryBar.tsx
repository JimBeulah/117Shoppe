import type { CategoryItem } from "@/types"
import { CategoryIcon } from "@/components/ui/CategoryIcon"

export function CategoryBar({ categories }: { categories: CategoryItem[] }) {
  return (
    <div className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => (
            <CategoryIcon key={cat.id} category={cat} />
          ))}
        </div>
      </div>
    </div>
  )
}
