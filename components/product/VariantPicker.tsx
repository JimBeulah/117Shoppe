"use client"

import type { ProductVariantItem } from "@/types"

interface VariantPickerProps {
  variants: ProductVariantItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function VariantPicker({ variants, selectedId, onSelect }: VariantPickerProps) {
  if (variants.length === 0) return null

  return (
    <div>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
        Option
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Product options">
        {variants.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            disabled={v.stock === 0}
            aria-pressed={v.id === selectedId}
            className={`px-3 py-1.5 rounded border text-sm transition-colors ${
              v.id === selectedId
                ? "border-brand-600 bg-brand-50 text-brand-700 font-medium"
                : v.stock === 0
                ? "border-border text-text-secondary opacity-50 cursor-not-allowed line-through"
                : "border-border text-text-primary hover:border-brand-400"
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>
    </div>
  )
}
