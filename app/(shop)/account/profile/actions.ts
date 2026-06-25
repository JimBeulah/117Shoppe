"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function updateProfileName(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim() ?? ""
  if (!name || name.length > 100) {
    throw new Error("Name must be between 1 and 100 characters")
  }

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  await clerkClient().users.updateUser(userId, { firstName: name })
  await prisma.user.update({ where: { clerkId: userId }, data: { name } })

  revalidatePath("/account/profile")
}
