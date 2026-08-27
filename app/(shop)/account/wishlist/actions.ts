"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { addToCart } from "@/app/(shop)/cart/actions"

export async function toggleWishlist(productId: string): Promise<{ error?: string; wishlisted?: boolean }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to save items to your wishlist." }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) return { error: "Product not found." }

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  })

  if (existing) {
    await prisma.wishlist.delete({
      where: { userId_productId: { userId: user.id, productId } },
    })
    revalidatePath("/account/wishlist")
    return { wishlisted: false }
  }

  await prisma.wishlist.create({ data: { userId: user.id, productId } })
  revalidatePath("/account/wishlist")
  return { wishlisted: true }
}

export async function removeFromWishlist(productId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  await prisma.wishlist.deleteMany({ where: { userId: user.id, productId } })

  revalidatePath("/account/wishlist")
  return {}
}

export async function moveToCart(productId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { variants: { select: { id: true }, take: 1 } },
  })
  if (!product) return { error: "Product not found." }
  if (product.variants.length > 0) {
    return { error: "Choose options on the product page." }
  }

  const result = await addToCart(productId, null, 1)
  if (result.error) return result

  await prisma.wishlist.deleteMany({ where: { userId: user.id, productId } })

  revalidatePath("/account/wishlist")
  revalidatePath("/", "layout")
  return {}
}
