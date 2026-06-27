"use client"

import { useEffect } from "react"
import { crossProduct } from "@/lib/utils"
import type { VariantOption, VariantCellData } from "@/types/seller"

interface Props {
  options: VariantOption[]
  matrix: Record<string, VariantCellData>
  onOptionsChange: (options: VariantOption[]) => void
  onMatrixChange: (matrix: Record<string, VariantCellData>) => void
}

const DEFAULT_CELL: VariantCellData = { price: 0, stock: 0, sku: "", image: "" }

function syncMatrix(
  newOptions: VariantOption[],
  oldMatrix: Record<string, VariantCellData>
): Record<string, VariantCellData> {
  const keys = crossProduct(newOptions)
  return Object.fromEntries(
    keys.map((key) => [key, oldMatrix[key] ?? { ...DEFAULT_CELL }])
  )
}

export default function VariantMatrixBuilder({ options, matrix, onOptionsChange, onMatrixChange }: Props) {
  // Sync matrix whenever options change
  useEffect(() => {
    onMatrixChange(syncMatrix(options, matrix))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options)])

  function addGroup() {
    if (options.length >= 2) return
    onOptionsChange([...options, { name: "", values: [] }])
  }

  function removeGroup(i: number) {
    const next = options.filter((_, j) => j !== i)
    onOptionsChange(next)
  }

  function updateGroupName(i: number, name: string) {
    const next = options.map((g, j) => (j === i ? { ...g, name } : g))
    onOptionsChange(next)
  }

  function addValue(groupIndex: number, value: string) {
    if (!value.trim()) return
    const next = options.map((g, j) =>
      j === groupIndex ? { ...g, values: [...g.values, value.trim()] } : g
    )
    onOptionsChange(next)
  }

  function removeValue(groupIndex: number, valueIndex: number) {
    const next = options.map((g, j) =>
      j === groupIndex ? { ...g, values: g.values.filter((_, k) => k !== valueIndex) } : g
    )
    onOptionsChange(next)
  }

  function updateCell(key: string, field: keyof VariantCellData, value: string | number) {
    onMatrixChange({ ...matrix, [key]: { ...(matrix[key] ?? DEFAULT_CELL), [field]: value } })
  }

  const matrixKeys = crossProduct(options)

  return (
    <div className="space-y-4">
      {options.map((group, i) => (
        <div key={i} className="border border-border-default rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={group.name}
              onChange={(e) => updateGroupName(i, e.target.value)}
              placeholder={i === 0 ? "e.g. Color" : "e.g. Size"}
              className="border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
            />
            <button
              type="button"
              onClick={() => removeGroup(i)}
              className="text-xs text-red-500 hover:underline"
            >
              Remove group
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.values.map((val, j) => (
              <span
                key={j}
                className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-full"
              >
                {val}
                <button type="button" onClick={() => removeValue(i, j)} className="text-brand-500 hover:text-brand-700">
                  ×
                </button>
              </span>
            ))}
            {group.values.length < 10 && (
              <input
                type="text"
                placeholder="Add value, press Enter"
                className="border border-border-default rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 w-40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addValue(i, (e.target as HTMLInputElement).value)
                    ;(e.target as HTMLInputElement).value = ""
                  }
                }}
              />
            )}
          </div>
        </div>
      ))}

      {options.length < 2 && (
        <button
          type="button"
          onClick={addGroup}
          className="text-sm text-brand-600 hover:underline border border-dashed border-brand-300 rounded px-4 py-2 w-full text-center hover:bg-brand-50"
        >
          + Add variant group
        </button>
      )}

      {matrixKeys.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border-default rounded">
            <thead className="bg-bg-page">
              <tr>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Variant</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Price (₱)</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Stock</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">SKU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {matrixKeys.map((key) => (
                <tr key={key}>
                  <td className="px-3 py-2 font-medium text-text-primary">{key}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={matrix[key]?.price ?? 0}
                      onChange={(e) => updateCell(key, "price", parseFloat(e.target.value) || 0)}
                      className="w-24 border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={matrix[key]?.stock ?? 0}
                      onChange={(e) => updateCell(key, "stock", parseInt(e.target.value, 10) || 0)}
                      className="w-20 border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={matrix[key]?.sku ?? ""}
                      onChange={(e) => updateCell(key, "sku", e.target.value)}
                      placeholder="Optional"
                      className="w-28 border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
