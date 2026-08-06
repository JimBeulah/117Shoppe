import { z } from "zod"

export const addressSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  street: z.string().trim().min(1, "Street is required"),
  barangay: z.string().trim().min(1, "Barangay is required"),
  city: z.string().trim().min(1, "City / Municipality is required"),
  province: z.string().trim().min(1, "Province is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  isDefault: z.boolean(),
})

export type AddressFormValues = z.infer<typeof addressSchema>
