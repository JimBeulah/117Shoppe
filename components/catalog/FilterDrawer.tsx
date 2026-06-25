"use client"

import { FilterSidebar } from "@/components/catalog/FilterSidebar"
import type { CatalogFilters } from "@/types"

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: CatalogFilters
}

export function FilterDrawer({ open, onClose, filters }: FilterDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-0 h-full w-80 bg-white p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Filters</h2>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="text-text-secondary hover:text-text-primary text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <FilterSidebar
          currentPriceMin={filters.priceMin}
          currentPriceMax={filters.priceMax}
          currentRating={filters.rating}
        />
      </div>
    </div>
  )
}
