import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({ prisma: { product: { findMany: vi.fn(), count: vi.fn() }, category: { findMany: vi.fn() } } }))
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react")
  return { ...actual, cache: (fn: unknown) => fn }
})

describe("parseCatalogFilters", () => {
  beforeEach(() => vi.resetModules())

  it("extracts q from search params", async () => {
    const { parseCatalogFilters } = await import("@/lib/data/catalog")
    const filters = parseCatalogFilters({ q: "phone case" })
    expect(filters.q).toBe("phone case")
  })

  it("defaults q to empty string when absent", async () => {
    const { parseCatalogFilters } = await import("@/lib/data/catalog")
    const filters = parseCatalogFilters({})
    expect(filters.q).toBe("")
  })

  it("extracts category slug from search params", async () => {
    const { parseCatalogFilters } = await import("@/lib/data/catalog")
    const filters = parseCatalogFilters({ category: "electronics" })
    expect(filters.category).toBe("electronics")
  })

  it("defaults category to null when absent", async () => {
    const { parseCatalogFilters } = await import("@/lib/data/catalog")
    const filters = parseCatalogFilters({})
    expect(filters.category).toBeNull()
  })
})

describe("buildSearchWhere", () => {
  beforeEach(() => vi.resetModules())

  it("always includes isActive: true", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: null, page: 1, q: "", category: null })
    expect(where.isActive).toBe(true)
  })

  it("adds OR clause for name/description when q is set", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: null, page: 1, q: "earbuds", category: null })
    expect(where.OR).toEqual([
      { name: { contains: "earbuds", mode: "insensitive" } },
      { description: { contains: "earbuds", mode: "insensitive" } },
    ])
  })

  it("does NOT add OR clause when q is empty string", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: null, page: 1, q: "", category: null })
    expect(where.OR).toBeUndefined()
  })

  it("filters by category slug when category is set", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: null, page: 1, q: "", category: "electronics" })
    expect(where.category).toEqual({ slug: "electronics" })
  })

  it("adds price.gte when priceMin > 0", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 500, priceMax: null, rating: null, page: 1, q: "", category: null })
    expect((where.price as Record<string, unknown>)?.gte).toBe(500)
  })

  it("adds price.lte when priceMax is set", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: 2000, rating: null, page: 1, q: "", category: null })
    expect((where.price as Record<string, unknown>)?.lte).toBe(2000)
  })

  it("adds rating.gte when rating is set", async () => {
    const { buildSearchWhere } = await import("@/lib/data/catalog")
    const where = buildSearchWhere({ sort: "best_seller", priceMin: 0, priceMax: null, rating: 4, page: 1, q: "", category: null })
    expect((where.rating as Record<string, unknown>)?.gte).toBe(4)
  })
})
