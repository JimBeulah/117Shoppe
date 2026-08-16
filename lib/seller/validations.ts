import { z } from "zod"

export const createShopSchema = z.object({
  name: z.string().trim().min(1, "Shop name is required").max(60, "Shop name is too long"),
  slug: z
    .string()
    .trim()
    .min(1, "Shop URL is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  logo: z.array(z.string()).max(1),
  banner: z.array(z.string()).max(1),
})

export type CreateShopInput = z.infer<typeof createShopSchema>

export const updateShopSchema = z.object({
  name: z.string().trim().min(1, "Shop name is required").max(60, "Shop name is too long"),
  logo: z.array(z.string()).max(1),
  banner: z.array(z.string()).max(1),
})

export type UpdateShopInput = z.infer<typeof updateShopSchema>

export const addStaffSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  permissions: z
    .array(z.enum(["PRODUCTS", "ORDERS", "REVIEWS", "CHAT"]))
    .min(1, "Select at least one permission"),
})

export type AddStaffInput = z.infer<typeof addStaffSchema>
