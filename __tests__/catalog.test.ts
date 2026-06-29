import { describe, it, expect, vi } from "vitest"

// Mock the DB module so parseCatalogFilters can be tested without a live DB
vi.mock("@/lib/db", () => ({
  prisma: {},
}))

import { parseCatalogFilters } from "@/lib/data/catalog"

describe("parseCatalogFilters", () => {
  it("returns defaults when searchParams is empty", () => {
    const result = parseCatalogFilters({})
    expect(result).toEqual({
      sort: "best_seller",
      priceMin: 0,
      priceMax: null,
      rating: null,
      page: 1,
      q: "",
      category: null,
    })
  })

  it("parses valid sort values", () => {
    expect(parseCatalogFilters({ sort: "price_asc" }).sort).toBe("price_asc")
    expect(parseCatalogFilters({ sort: "price_desc" }).sort).toBe("price_desc")
    expect(parseCatalogFilters({ sort: "newest" }).sort).toBe("newest")
  })

  it("falls back to best_seller for unknown sort", () => {
    expect(parseCatalogFilters({ sort: "invalid" }).sort).toBe("best_seller")
  })

  it("parses price range", () => {
    const result = parseCatalogFilters({ price_min: "100", price_max: "5000" })
    expect(result.priceMin).toBe(100)
    expect(result.priceMax).toBe(5000)
  })

  it("omits priceMax when not provided", () => {
    expect(parseCatalogFilters({ price_min: "100" }).priceMax).toBeNull()
  })

  it("clamps priceMin to 0 for negative values", () => {
    expect(parseCatalogFilters({ price_min: "-50" }).priceMin).toBe(0)
  })

  it("parses rating 3 and 4", () => {
    expect(parseCatalogFilters({ rating: "4" }).rating).toBe(4)
    expect(parseCatalogFilters({ rating: "3" }).rating).toBe(3)
  })

  it("returns null rating for unknown rating values", () => {
    expect(parseCatalogFilters({ rating: "5" }).rating).toBeNull()
    expect(parseCatalogFilters({ rating: "2" }).rating).toBeNull()
  })

  it("parses page number", () => {
    expect(parseCatalogFilters({ page: "3" }).page).toBe(3)
  })

  it("clamps page to minimum 1", () => {
    expect(parseCatalogFilters({ page: "0" }).page).toBe(1)
    expect(parseCatalogFilters({ page: "-1" }).page).toBe(1)
  })
})
