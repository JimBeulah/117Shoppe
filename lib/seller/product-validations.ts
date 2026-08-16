import { z } from "zod"

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200, "Product name is too long"),
  slug: z
    .string()
    .trim()
    .min(1, "URL slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().trim().min(1, "Description is required"),
  parentCategoryId: z.string().min(1, "Category is required"),
  categoryId: z.string().min(1, "Subcategory is required"),
  brandId: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
  originalPrice: z.number().min(0).optional(),
  images: z.array(z.string()),
  stock: z.number().int().min(0),
  isActive: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
