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
