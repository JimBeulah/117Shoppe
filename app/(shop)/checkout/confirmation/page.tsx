import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, MapPin, Package } from "lucide-react"
import { getOrderById } from "@/lib/data/checkout"
import { formatPrice } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ orderId?: string }>
}

export default async function ConfirmationPage({ searchParams }: Props) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { orderId } = await searchParams
  if (!orderId) redirect("/")

  const order = await getOrderById(orderId)
  if (!order) redirect("/")

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Success header */}
        <div className="text-center space-y-2">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-text-primary">Order Placed!</h1>
          <p className="text-sm text-text-secondary">
            Your order from <strong>{order.shop.name}</strong> has been received.
          </p>
          <p className="text-xs text-text-secondary font-mono">Order #{order.id.slice(-8).toUpperCase()}</p>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-brand-600" />
            Delivery To
          </h2>
          <p className="text-sm font-medium text-text-primary">
            {order.address.fullName} · {order.address.phone}
          </p>
          <p className="text-sm text-text-secondary mt-0.5">
            {order.address.street}, {order.address.barangay}, {order.address.city}, {order.address.province}{" "}
            {order.address.postalCode}
          </p>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-bg-subtle flex items-center gap-1.5">
            <Package className="w-4 h-4 text-brand-600" />
            <p className="text-sm font-semibold text-text-primary">{order.shop.name}</p>
          </div>
          <div className="divide-y divide-border">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 px-4 py-3">
                <div className="relative w-14 h-14 shrink-0 rounded overflow-hidden bg-bg-subtle">
                  {item.product.images[0] && (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary line-clamp-1">{item.product.name}</p>
                  {item.variant && (
                    <p className="text-xs text-text-secondary">{item.variant.name}</p>
                  )}
                  <p className="text-xs text-text-secondary mt-0.5">x{item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-text-primary shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border space-y-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Shipping</span>
              <span>{formatPrice(order.shippingFee)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Voucher {order.voucher ? `(${order.voucher.code})` : ""}</span>
                <span className="text-green-600">-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-text-primary">
              <span>Total</span>
              <span className="text-accent-sale">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-white rounded-lg border border-border p-4 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Payment Method</span>
            <span className="text-text-primary font-medium">
              {order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}
            </span>
          </div>
          <div className="flex justify-between text-text-secondary mt-1">
            <span>Order Status</span>
            <span className="font-medium text-blue-600">Confirmed</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 py-3 rounded-lg border border-border text-sm font-semibold text-text-primary text-center hover:bg-bg-subtle transition-colors"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="flex-1 py-3 rounded-lg bg-brand-600 text-white text-sm font-semibold text-center hover:bg-brand-700 transition-colors"
          >
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  )
}
