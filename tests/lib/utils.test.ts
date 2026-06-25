import { describe, it, expect } from 'vitest'
import { formatPrice, formatSold, calcDiscount } from '@/lib/utils'

describe('formatPrice', () => {
  it('formats integer prices with peso sign and commas', () => {
    expect(formatPrice(1299)).toBe('₱1,299')
  })
  it('formats prices over 1000', () => {
    expect(formatPrice(12999)).toBe('₱12,999')
  })
  it('formats prices under 1000 without comma', () => {
    expect(formatPrice(299)).toBe('₱299')
  })
})

describe('formatSold', () => {
  it('shows exact count under 1000', () => {
    expect(formatSold(892)).toBe('892 sold')
  })
  it('abbreviates 1000+ with k', () => {
    expect(formatSold(3420)).toBe('3.4k sold')
  })
  it('abbreviates exactly 1000', () => {
    expect(formatSold(1000)).toBe('1k sold')
  })
})

describe('calcDiscount', () => {
  it('calculates percent discount correctly', () => {
    expect(calcDiscount(1999, 1299)).toBe(35)
  })
  it('returns 0 when prices are equal', () => {
    expect(calcDiscount(999, 999)).toBe(0)
  })
})
