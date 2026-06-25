"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState } from "react"

const RATING_OPTIONS = [
  { value: "4", label: "4★ & Up" },
  { value: "3", label: "3★ & Up" },
]

interface FilterSidebarProps {
  currentPriceMin: number
  currentPriceMax: number | null
  currentRating: number | null
}

export function FilterSidebar({ currentPriceMin, currentPriceMax, currentRating }: FilterSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [minInput, setMinInput] = useState(currentPriceMin > 0 ? String(currentPriceMin) : "")
  const [maxInput, setMaxInput] = useState(currentPriceMax !== null ? String(currentPriceMax) : "")

  function applyFilters(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  function handlePriceCommit() {
    applyFilters({
      price_min: minInput || null,
      price_max: maxInput || null,
    })
  }

  function handleRating(value: string) {
    const current = currentRating !== null ? String(currentRating) : ""
    applyFilters({ rating: current === value ? null : value })
  }

  function clearAll() {
    setMinInput("")
    setMaxInput("")
    router.replace(pathname)
  }

  return (
    <aside className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-text-primary">Filters</h3>
        <button onClick={clearAll} className="text-xs text-brand-600 hover:underline">
          Clear all
        </button>
      </div>

      <div>
        <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
          Price Range (₱)
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={handlePriceCommit}
            onKeyDown={(e) => e.key === "Enter" && handlePriceCommit()}
            className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400"
            aria-label="Minimum price"
          />
          <span className="text-text-secondary text-sm" aria-hidden="true">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={handlePriceCommit}
            onKeyDown={(e) => e.key === "Enter" && handlePriceCommit()}
            className="w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-400"
            aria-label="Maximum price"
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Rating</h4>
        <div className="space-y-1.5" role="radiogroup" aria-label="Filter by rating">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRating(opt.value)}
              role="radio"
              aria-checked={String(currentRating) === opt.value}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                String(currentRating) === opt.value
                  ? "bg-brand-100 text-brand-700 font-medium"
                  : "hover:bg-brand-50 text-text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
