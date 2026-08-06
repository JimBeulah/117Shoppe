import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import type { AddressItem, OrderConfirmation } from "@/types"

export async function getUserAddresses(): Promise<AddressItem[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  })

  return addresses.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    phone: a.phone,
    street: a.street,
    barangay: a.barangay,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode,
    isDefault: a.isDefault,
  }))
}

export async function getOrderById(orderId: string): Promise<OrderConfirmation | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shop: true,
      address: true,
      payment: true,
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  })

  if (!order || order.userId !== user.id) return null

  return {
    id: order.id,
    status: order.status,
    total: order.total,
    shippingFee: order.shippingFee,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    shop: { name: order.shop.name, slug: order.shop.slug },
    address: {
      id: order.address.id,
      fullName: order.address.fullName,
      phone: order.address.phone,
      street: order.address.street,
      barangay: order.address.barangay,
      city: order.address.city,
      province: order.address.province,
      postalCode: order.address.postalCode,
      isDefault: order.address.isDefault,
    },
    items: order.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      price: i.price,
      product: { name: i.product.name, images: i.product.images },
      variant: i.variant ? { name: i.variant.name } : null,
    })),
    payment: order.payment
      ? {
          method: order.payment.method,
          status: order.payment.status,
          amount: order.payment.amount,
        }
      : null,
  }
}
