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
