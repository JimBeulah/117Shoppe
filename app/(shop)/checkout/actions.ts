"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"

const SHIPPING_FEE = 49

export async function placeOrder(
  addressId: string,
  paymentMethod: "COD"
): Promise<{ orderIds?: string[]; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const address = await prisma.address.findUnique({ where: { id: addressId } })
  if (!address || address.userId !== user.id) return { error: "Invalid address" }

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: { include: { shop: true } },
          variant: true,
        },
      },
    },
  })

  if (!cart || cart.items.length === 0) return { error: "Cart is empty" }

  // Validate stock
  for (const item of cart.items) {
    const availableStock = item.variant ? item.variant.stock : item.product.stock
    if (item.quantity > availableStock) {
      return {
        error: `"${item.product.name}" only has ${availableStock} piece${availableStock !== 1 ? "s" : ""} left.`,
      }
    }
  }

  // Group by shop
  const shopGroups = new Map<string, typeof cart.items>()
  for (const item of cart.items) {
    const shopId = item.product.shop.id
    if (!shopGroups.has(shopId)) shopGroups.set(shopId, [])
    shopGroups.get(shopId)!.push(item)
  }

  const orderIds: string[] = []

  for (const [shopId, items] of shopGroups) {
    const itemsTotal = items.reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.product.price
      return sum + price * item.quantity
    }, 0)
    const orderTotal = itemsTotal + SHIPPING_FEE

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          shopId,
          addressId,
          paymentMethod,
          total: orderTotal,
          shippingFee: SHIPPING_FEE,
          status: "PENDING",
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantity: item.quantity,
              price: item.variant ? item.variant.price : item.product.price,
            })),
          },
        },
      })

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          method: paymentMethod,
          status: "PENDING",
          amount: orderTotal,
        },
      })

      // Decrement stock
      for (const item of items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          })
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
              sold: { increment: item.quantity },
            },
          })
        }
      }

      return newOrder
    })

    orderIds.push(order.id)
  }

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })

  revalidatePath("/cart")
  revalidatePath("/", "layout")

  return { orderIds }
}
