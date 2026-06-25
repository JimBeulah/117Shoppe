import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null
  return prisma.user.findUnique({ where: { clerkId: userId } })
}
