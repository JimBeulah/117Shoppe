"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { activeFlashSaleItemInclude, effectivePrice } from "@/lib/data/flashSale"
import { validateVoucherCode, type VoucherValidationResult } from "@/lib/data/voucher"
import { splitProportionally } from "@/lib/voucher"
import { createNotification } from "@/lib/notifications/create"
import { buildNewOrderCopy } from "@/lib/notifications/copy"

const SHIPPING_FEE = 49

export async function applyVoucher(code: string): Promise<VoucherValidationResult> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: { include: { flashSaleItems: activeFlashSaleItemInclude() } },
          variant: true,
        },
      },
    },
  })
  if (!cart || cart.items.length === 0) return { error: "Cart is empty" }

  const subtotal = cart.items.reduce((sum, item) => {
    return sum + effectivePrice(item.product, item.variant) * item.quantity
  }, 0)

  return validateVoucherCode(code, subtotal)
}

export async function placeOrder(
  addressId: string,
  paymentMethod: "COD",
  voucherCode?: string
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
          product: { include: { shop: true, flashSaleItems: activeFlashSaleItemInclude() } },
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

  const groupEntries = Array.from(shopGroups.entries())
  const itemsTotals = groupEntries.map(([, items]) =>
    items.reduce((sum, item) => sum + effectivePrice(item.product, item.variant) * item.quantity, 0)
  )
  const cartSubtotal = itemsTotals.reduce((a, b) => a + b, 0)

  let voucherId: string | null = null
  let shopDiscounts = itemsTotals.map(() => 0)

  if (voucherCode) {
    const result = await validateVoucherCode(voucherCode, cartSubtotal)
    if (result.error || !result.voucher || result.discountAmount == null) {
      return { error: result.error ?? "Invalid voucher code" }
    }
    voucherId = result.voucher.id
    shopDiscounts = splitProportionally(result.discountAmount, itemsTotals)
  }

  const orderIds: string[] = []

  for (let i = 0; i < groupEntries.length; i++) {
    const [shopId, items] = groupEntries[i]
    const itemsTotal = itemsTotals[i]
    const discountAmount = shopDiscounts[i]
    const orderTotal = itemsTotal - discountAmount + SHIPPING_FEE

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          shopId,
          addressId,
          paymentMethod,
          total: orderTotal,
          shippingFee: SHIPPING_FEE,
          discountAmount,
          voucherId,
          status: "PAID",
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantity: item.quantity,
              price: effectivePrice(item.product, item.variant),
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

    const shop = items[0].product.shop
    await createNotification({ userId: shop.ownerId, ...buildNewOrderCopy(order.id, user.name) })
  }

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })

  revalidatePath("/cart")
  revalidatePath("/", "layout")

  return { orderIds }
}
