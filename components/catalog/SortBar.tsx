"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { FilterDrawer } from "@/components/catalog/FilterDrawer"
import type { CatalogFilters, CategoryItem } from "@/types"

const SORT_OPTIONS = [
  { value: "best_seller", label: "Best Seller" },
  { value: "newest",      label: "Newest" },
  { value: "price_asc",   label: "Price: Low to High" },
  { value: "price_desc",  label: "Price: High to Low" },
] as const

interface SortBarProps {
  total: number
  currentSort: string
  filters: CatalogFilters
  categories?: CategoryItem[]
}

export function SortBar({ total, currentSort, filters, categories }: SortBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  function handleSort(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", value)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        categories={categories}
      />
      <div className="flex items-center justify-between py-3 border-b border-border">
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">{total.toLocaleString()}</span> results
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center gap-1.5 text-sm border border-border rounded px-3 py-1.5 hover:border-brand-400 transition-colors"
            aria-label="Open filters"
          >
            ⚙️ Filters
          </button>
          <select
            value={currentSort}
            onChange={(e) => handleSort(e.target.value)}
            className="text-sm border border-border rounded px-3 py-1.5 bg-white focus:outline-none focus:border-brand-400"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}
