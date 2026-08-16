import { cache } from "react"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import type { CartGroup } from "@/types"

export const getCart = cache(async (): Promise<CartGroup[] | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: {
            include: { shop: true },
          },
          variant: true,
        },
        orderBy: { id: "asc" },
      },
    },
  })

  if (!cart || cart.items.length === 0) return null

  const groupMap = new Map<string, CartGroup>()
  for (const item of cart.items) {
    const { shop } = item.product
    if (!groupMap.has(shop.id)) {
      groupMap.set(shop.id, {
        shopId: shop.id,
        shopName: shop.name,
        shopSlug: shop.slug,
        isOnVacation: shop.isOnVacation,
        items: [],
      })
    }
    groupMap.get(shop.id)!.items.push({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.product.price,
        images: item.product.images,
        stock: item.product.stock,
        shopId: shop.id,
      },
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            price: item.variant.price,
            stock: item.variant.stock,
          }
        : null,
    })
  }

  return Array.from(groupMap.values())
})

export async function getCartItemCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) return 0

  try {
    return await prisma.cartItem.count({
      where: { cart: { userId: user.id } },
    })
  } catch {
    return 0
  }
}
