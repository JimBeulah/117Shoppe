"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toggleProduct, deleteProduct, bulkUpdateProducts } from "@/lib/seller/actions"
import { formatPrice } from "@/lib/utils"
import type { SellerProductRow } from "@/types/seller"

interface Props {
  products: SellerProductRow[]
}

export default function ProductsBulkTable({ products }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [priceMode, setPriceMode] = useState<"percent" | "fixed">("percent")
  const [priceDirection, setPriceDirection] = useState<"increase" | "decrease">("increase")
  const [priceValue, setPriceValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const allSelected = products.length > 0 && selected.size === products.length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function runBulk(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res.error) setError(res.error)
      else setSelected(new Set())
    })
  }

  function handleSetActive(isActive: boolean) {
    runBulk(() => bulkUpdateProducts(Array.from(selected), { type: "setActive", isActive }))
  }

  function handleDelete() {
    if (!confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) return
    runBulk(() => bulkUpdateProducts(Array.from(selected), { type: "setActive", isActive: false }))
  }

  function handleApplyPrice() {
    const value = parseFloat(priceValue)
    if (!value || value <= 0) {
      setError("Enter a valid price adjustment value")
      return
    }
    runBulk(() =>
      bulkUpdateProducts(Array.from(selected), {
        type: "adjustPrice",
        mode: priceMode,
        direction: priceDirection,
        value,
      })
    )
    setPriceValue("")
  }

  return (
    <div className="bg-white rounded-lg border border-border-default overflow-hidden">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border-default bg-brand-50">
          <span className="text-sm font-medium text-text-primary">{selected.size} selected</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSetActive(true)}
            className="text-xs px-3 py-1.5 rounded border border-border-default bg-white hover:bg-brand-100 disabled:opacity-50"
          >
            Activate
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSetActive(false)}
            className="text-xs px-3 py-1.5 rounded border border-border-default bg-white hover:bg-brand-100 disabled:opacity-50"
          >
            Deactivate
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <select
              value={priceDirection}
              onChange={(e) => setPriceDirection(e.target.value as "increase" | "decrease")}
              className="text-xs border border-border-default rounded px-2 py-1.5"
            >
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
            </select>
            <select
              value={priceMode}
              onChange={(e) => setPriceMode(e.target.value as "percent" | "fixed")}
              className="text-xs border border-border-default rounded px-2 py-1.5"
            >
              <option value="percent">%</option>
              <option value="fixed">₱</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              placeholder="Value"
              className="text-xs border border-border-default rounded px-2 py-1.5 w-20"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={handleApplyPrice}
              className="text-xs px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Apply price
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-text-secondary hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <p className="px-4 py-2 text-xs text-red-600 border-b border-border-default">{error}</p>
      )}

      <table className="w-full text-sm">
        <thead className="border-b border-border-default bg-bg-page">
          <tr>
            <th className="px-4 py-3 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all products"
              />
            </th>
            <th className="text-left px-4 py-3 text-text-secondary font-medium">Product</th>
            <th className="text-right px-4 py-3 text-text-secondary font-medium">Price</th>
            <th className="text-right px-4 py-3 text-text-secondary font-medium">Stock</th>
            <th className="text-right px-4 py-3 text-text-secondary font-medium">Sold</th>
            <th className="text-center px-4 py-3 text-text-secondary font-medium">Status</th>
            <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-brand-50 transition-colors">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(product.id)}
                  onChange={() => toggleOne(product.id)}
                  aria-label={`Select ${product.name}`}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded border border-border-default flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-brand-50 rounded border border-border-default flex-shrink-0" />
                  )}
                  <span className="font-medium text-text-primary truncate max-w-[200px]">
                    {product.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-text-primary">{formatPrice(product.price)}</td>
              <td className="px-4 py-3 text-right text-text-primary">{product.stock}</td>
              <td className="px-4 py-3 text-right text-text-secondary">{product.sold}</td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    product.status === "APPROVED"
                      ? "bg-green-100 text-green-700"
                      : product.status === "REJECTED"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                  title={
                    product.status === "REJECTED" && product.rejectionReason
                      ? product.rejectionReason
                      : undefined
                  }
                >
                  {product.status}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await toggleProduct(product.id, !product.isActive)
                    })
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                    product.isActive ? "bg-brand-600" : "bg-gray-200"
                  }`}
                  title={product.isActive ? "Deactivate" : "Activate"}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      product.isActive ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/seller/products/${product.id}/edit`}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm("Delete this product? This cannot be undone.")) return
                      startTransition(async () => {
                        await deleteProduct(product.id)
                      })
                    }}
                    className="text-xs text-red-500 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
