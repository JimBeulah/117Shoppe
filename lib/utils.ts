import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return `₱${price.toLocaleString('en-PH')}`
}

export function formatSold(sold: number): string {
  if (sold >= 1000) {
    const k = (sold / 1000).toFixed(sold % 1000 === 0 ? 0 : 1)
    return `${k}k sold`
  }
  return `${sold} sold`
}

export function calcDiscount(original: number, current: number): number {
  if (original <= current) return 0
  return Math.round(((original - current) / original) * 100)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export function crossProduct(groups: { name: string; values: string[] }[]): string[] {
  const filled = groups.map((g) => g.values.filter((v) => v.trim() !== ""))
  if (filled.length === 0 || filled[0].length === 0) return []
  if (filled.length === 1) return filled[0]
  return filled[0].flatMap((v1) => filled[1].map((v2) => `${v1} / ${v2}`))
}
