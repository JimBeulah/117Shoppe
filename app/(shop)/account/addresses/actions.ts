"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"

export interface AddressFormData {
  fullName: string
  phone: string
  street: string
  city: string
  province: string
  postalCode: string
  isDefault: boolean
}

async function clearOtherDefaults(userId: string) {
  await prisma.address.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  })
}

export async function createAddress(data: AddressFormData): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  if (data.isDefault) await clearOtherDefaults(user.id)

  await prisma.address.create({
    data: { ...data, userId: user.id },
  })

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
  return {}
}

export async function updateAddress(
  id: string,
  data: AddressFormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const address = await prisma.address.findUnique({ where: { id } })
  if (!address || address.userId !== user.id) return { error: "Not found" }

  if (data.isDefault) await clearOtherDefaults(user.id)

  await prisma.address.update({ where: { id }, data })

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
  return {}
}

export async function deleteAddress(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const address = await prisma.address.findUnique({ where: { id } })
  if (!address || address.userId !== user.id) return { error: "Not found" }

  const pendingOrder = await prisma.order.findFirst({
    where: { addressId: id, status: "PENDING" },
  })
  if (pendingOrder) return { error: "Cannot delete address used by a pending order." }

  await prisma.address.delete({ where: { id } })

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
  return {}
}

export async function setDefaultAddress(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const address = await prisma.address.findUnique({ where: { id } })
  if (!address || address.userId !== user.id) return { error: "Not found" }

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ])

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
  return {}
}
