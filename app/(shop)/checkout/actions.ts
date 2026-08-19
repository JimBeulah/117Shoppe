"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { activeFlashSaleItemInclude, effectivePrice } from "@/lib/data/flashSale"
import { validateVoucherCode, type VoucherValidationResult } from "@/lib/data/voucher"
import { splitProportionally } from "@/lib/voucher"
import { createNotification } from "@/lib/notifications/create"
import { buildNewOrderCopy } from "@/lib/notifications/copy"
import { createPaymongoLink } from "@/lib/payments/paymongo"
import { getShippingOptionsForShops, type ShippingRateOption } from "@/lib/shipping/rates"
import { logOrderEvent } from "@/lib/orders/timeline"
import { logStockMovement } from "@/lib/inventory/stock"
import { createReservation, releaseExpiredReservations } from "@/lib/inventory/reservations"

export async function getShippingOptionsForAddress(
  addressId: string
): Promise<{ options?: Record<string, ShippingRateOption[]>; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const address = await prisma.address.findUnique({ where: { id: addressId } })
  if (!address || address.userId !== user.id) return { error: "Invalid address" }

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: { include: { shop: true } } } } },
  })
  if (!cart || cart.items.length === 0) return { error: "Cart is empty" }

  const shopIds = Array.from(new Set(cart.items.map((i) => i.product.shop.id)))
  const options = await getShippingOptionsForShops(shopIds, address.province)
  return { options }
}

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
  paymentMethod: "COD" | "PAYMONGO",
  shippingSelections: Record<string, string>,
  voucherCode?: string
): Promise<{ orderIds?: string[]; checkoutUrl?: string; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  // Free up stock from any abandoned checkouts before checking availability
  await releaseExpiredReservations()

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

  // Validate stock and shop availability
  for (const item of cart.items) {
    if (item.product.shop.isOnVacation) {
      return {
        error: `"${item.product.shop.name}" is currently on vacation and cannot fulfill orders right now. Please remove it from your cart.`,
      }
    }
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

  const shopIds = groupEntries.map(([shopId]) => shopId)
  const shippingOptionsByShop = await getShippingOptionsForShops(shopIds, address.province)

  const resolvedShipping: { methodId: string; name: string; carrier: string; price: number }[] = []
  for (const shopId of shopIds) {
    const selectedMethodId = shippingSelections[shopId]
    if (!selectedMethodId) return { error: "Please select a shipping method for every shop." }
    const options = shippingOptionsByShop[shopId] ?? []
    const option = options.find((o) => o.methodId === selectedMethodId)
    if (!option) {
      return { error: "One of your selected shipping methods is no longer available. Please re-select." }
    }
    resolvedShipping.push({ methodId: option.methodId, name: option.name, carrier: option.carrier, price: option.price })
  }

  const orderIds: string[] = []

  for (let i = 0; i < groupEntries.length; i++) {
    const [shopId, items] = groupEntries[i]
    const itemsTotal = itemsTotals[i]
    const discountAmount = shopDiscounts[i]
    const shipping = resolvedShipping[i]
    const orderTotal = itemsTotal - discountAmount + shipping.price

    let order
    try {
      order = await prisma.$transaction(async (tx) => {
        // Decrement stock atomically first, aborting if concurrent orders left too little
        const stockMovements: {
          productId: string
          variantId: string | null
          quantity: number
          quantityBefore: number
        }[] = []
        for (const item of items) {
          // Best-effort: deplete the flash-sale promo pool for items sold at
          // the flash price. Real Product/Variant stock (below) remains the
          // sole source of oversell protection; if the flash pool ran out
          // between page load and now, the buyer still keeps the flash price
          // already locked in — we just skip tracking it against the pool.
          const flashItem = item.product.flashSaleItems[0]
          if (flashItem) {
            await tx.flashSaleItem.updateMany({
              where: { id: flashItem.id, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            })
          }

          if (item.variantId) {
            const result = await tx.productVariant.updateMany({
              where: { id: item.variantId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            })
            if (result.count === 0) {
              throw new Error(`"${item.product.name}" no longer has enough stock.`)
            }
            stockMovements.push({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              quantityBefore: item.variant!.stock,
            })
          } else {
            const result = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } },
            })
            if (result.count === 0) {
              throw new Error(`"${item.product.name}" no longer has enough stock.`)
            }
            stockMovements.push({
              productId: item.productId,
              variantId: null,
              quantity: item.quantity,
              quantityBefore: item.product.stock,
            })
          }
        }

        const newOrder = await tx.order.create({
          data: {
            userId: user.id,
            shopId,
            addressId,
            paymentMethod,
            total: orderTotal,
            shippingFee: shipping.price,
            shippingMethodId: shipping.methodId,
            shippingMethodName: `${shipping.name} (${shipping.carrier})`,
            discountAmount,
            voucherId,
            status: paymentMethod === "COD" ? "PAID" : "PENDING",
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
            provider: paymentMethod,
            status: "PENDING",
            amount: orderTotal,
          },
        })

        for (const movement of stockMovements) {
          await logStockMovement(tx, {
            productId: movement.productId,
            variantId: movement.variantId,
            shopId,
            type: "SALE",
            delta: -movement.quantity,
            quantityBefore: movement.quantityBefore,
            quantityAfter: movement.quantityBefore - movement.quantity,
            orderId: newOrder.id,
            actorId: user.id,
            actorRole: "BUYER",
          })
          await createReservation(tx, {
            productId: movement.productId,
            variantId: movement.variantId,
            shopId,
            orderId: newOrder.id,
            quantity: movement.quantity,
            // COD is confirmed at placement; online payment holds until the
            // PayMongo webhook confirms it (or the hold expires and releases).
            committed: paymentMethod === "COD",
          })
        }

        await logOrderEvent(tx, {
          orderId: newOrder.id,
          type: "ORDER_PLACED",
          message: "Order placed.",
          actorId: user.id,
          actorRole: "BUYER",
        })
        if (paymentMethod === "COD") {
          await logOrderEvent(tx, {
            orderId: newOrder.id,
            type: "PAYMENT_RECEIVED",
            message: "Cash on Delivery selected — payment due upon delivery.",
          })
        }

        return newOrder
      })
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to place order." }
    }

    orderIds.push(order.id)

    const shop = items[0].product.shop
    await createNotification({ userId: shop.ownerId, ...buildNewOrderCopy(order.id, user.name) })
  }

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })

  revalidatePath("/cart")
  revalidatePath("/", "layout")

  if (paymentMethod === "PAYMONGO") {
    const shippingTotal = resolvedShipping.reduce((sum, s) => sum + s.price, 0)
    const grandTotal = itemsTotals.reduce((sum, itemsTotal, i) => sum + itemsTotal - shopDiscounts[i], 0) +
      shippingTotal

    try {
      const link = await createPaymongoLink(grandTotal, `117Shoppe order ${orderIds.join(", ")}`)
      await prisma.payment.updateMany({
        where: { orderId: { in: orderIds } },
        data: { checkoutSessionId: link.id },
      })
      return { orderIds, checkoutUrl: link.attributes.checkout_url }
    } catch {
      return { orderIds, error: "Failed to start online payment. Please retry from your order page." }
    }
  }

  return { orderIds }
}
