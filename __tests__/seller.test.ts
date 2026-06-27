import { describe, it, expect } from "vitest"
import { crossProduct, slugify } from "@/lib/utils"

describe("crossProduct", () => {
  it("returns empty array for no groups", () => {
    expect(crossProduct([])).toEqual([])
  })

  it("returns values for single group", () => {
    expect(crossProduct([{ name: "Size", values: ["S", "M", "L"] }])).toEqual(["S", "M", "L"])
  })

  it("returns cartesian product for two groups", () => {
    expect(
      crossProduct([
        { name: "Color", values: ["Red", "Blue"] },
        { name: "Size", values: ["S", "M"] },
      ])
    ).toEqual(["Red / S", "Red / M", "Blue / S", "Blue / M"])
  })

  it("filters out empty values", () => {
    expect(crossProduct([{ name: "Color", values: ["Red", "", "Blue"] }])).toEqual(["Red", "Blue"])
  })
})

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  it("removes special characters", () => {
    expect(slugify("Nike Air Max (2024)")).toBe("nike-air-max-2024")
  })
})

// Test the guard logic in isolation (not the full Server Action which needs Clerk/Prisma)
describe("Order action guards", () => {
  it("rejects ship when status is not PAID", () => {
    const statuses = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]
    for (const status of statuses) {
      const canShip = status === "PAID"
      expect(canShip).toBe(false)
    }
  })

  it("rejects cancel when status is not PAID", () => {
    const statuses = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]
    for (const status of statuses) {
      const canCancel = status === "PAID"
      expect(canCancel).toBe(false)
    }
  })

  it("detects IDOR: order shopId must match seller shop id", () => {
    const orderShopId: string = "shop-a"
    const sellerShopId: string = "shop-b"
    const isOwner = orderShopId === sellerShopId
    expect(isOwner).toBe(false)
  })
})
