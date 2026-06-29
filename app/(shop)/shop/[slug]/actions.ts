"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"

export async function toggleFollow(
  shopId: string,
  shopSlug: string
): Promise<{ following: boolean; followerCount: number }> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const existing = await prisma.shopFollow.findUnique({
    where: { userId_shopId: { userId: user.id, shopId } },
  })

  if (existing) {
    await prisma.shopFollow.delete({
      where: { userId_shopId: { userId: user.id, shopId } },
    })
    await prisma.shop.update({
      where: { id: shopId },
      data: { followersCount: { decrement: 1 } },
    })
  } else {
    await prisma.shopFollow.create({
      data: { userId: user.id, shopId },
    })
    await prisma.shop.update({
      where: { id: shopId },
      data: { followersCount: { increment: 1 } },
    })
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { followersCount: true },
  })

  revalidatePath(`/shop/${shopSlug}`)

  return {
    following: !existing,
    followerCount: shop?.followersCount ?? 0,
  }
}
