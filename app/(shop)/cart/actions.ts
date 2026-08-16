"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"

export async function addToCart(
  productId: string,
  variantId: string | null,
  quantity: number
): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to add items to your cart." }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { shop: { select: { isOnVacation: true } } },
  })
  if (!product) return { error: "Product not found." }
  if (product.shop.isOnVacation) {
    return { error: "This shop is currently on vacation and not accepting orders." }
  }

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  })

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null },
  })

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: { increment: quantity } },
    })
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
    })
  }

  revalidatePath("/cart")
  revalidatePath("/", "layout")
  return {}
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  })

  if (!item || item.cart.userId !== user.id) return { error: "Not found" }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } })
  } else {
    await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } })
  }

  revalidatePath("/cart")
  revalidatePath("/", "layout")
  return {}
}

export async function removeCartItem(cartItemId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  })

  if (!item || item.cart.userId !== user.id) return { error: "Not found" }

  await prisma.cartItem.delete({ where: { id: cartItemId } })

  revalidatePath("/cart")
  revalidatePath("/", "layout")
  return {}
}
