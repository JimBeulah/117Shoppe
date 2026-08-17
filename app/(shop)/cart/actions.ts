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
    select: {
      stock: true,
      shop: { select: { isOnVacation: true } },
      variants: variantId ? { where: { id: variantId }, select: { id: true, stock: true } } : false,
    },
  })
  if (!product) return { error: "Product not found." }
  if (product.shop.isOnVacation) {
    return { error: "This shop is currently on vacation and not accepting orders." }
  }

  const variant = variantId ? product.variants?.[0] : null
  if (variantId && !variant) return { error: "Product variant not found." }
  const availableStock = variant ? variant.stock : product.stock

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  })

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null },
  })

  const desiredQuantity = (existing?.quantity ?? 0) + quantity
  if (desiredQuantity > availableStock) {
    return {
      error:
        availableStock <= 0
          ? "This item is out of stock."
          : `Only ${availableStock} piece${availableStock !== 1 ? "s" : ""} left in stock.`,
    }
  }

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
    include: { cart: true, product: { select: { stock: true } }, variant: { select: { stock: true } } },
  })

  if (!item || item.cart.userId !== user.id) return { error: "Not found" }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } })
  } else {
    const availableStock = item.variant ? item.variant.stock : item.product.stock
    if (quantity > availableStock) {
      return {
        error:
          availableStock <= 0
            ? "This item is out of stock."
            : `Only ${availableStock} piece${availableStock !== 1 ? "s" : ""} left in stock.`,
      }
    }
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
