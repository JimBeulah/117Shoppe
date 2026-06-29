import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (existing) return existing

  // User is authenticated in Clerk but missing from DB (e.g. webhook not yet configured).
  // Upsert from Clerk profile so local dev works without a live webhook.
  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ""
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email

  return prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email, name, avatar: clerkUser.imageUrl ?? null, role: "BUYER" },
  })
}
