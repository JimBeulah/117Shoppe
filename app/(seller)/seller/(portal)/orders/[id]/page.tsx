import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop, getSellerOrderDetail } from "@/lib/seller/queries"
import { shipOrder } from "@/lib/seller/actions"
import CancelOrderModal from "@/components/seller/CancelOrderModal"
import { formatPrice } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { error: shipError } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const order = await getSellerOrderDetail(id, shop.id)
  if (!order) notFound()

  const itemsTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/seller/orders"
            className="text-sm text-text-secondary hover:underline"
          >
            ← Orders
          </Link>
          <h1 className="text-xl font-bold text-text-primary mt-1">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
        </div>
        <span
          className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {order.status}
        </span>
      </div>

      {/* Buyer Info */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-2">
        <h2 className="font-semibold text-text-primary text-sm">Buyer & Shipping</h2>
        <p className="text-sm text-text-primary">{order.address.fullName}</p>
        <p className="text-sm text-text-secondary">{order.address.phone}</p>
        <p className="text-sm text-text-secondary">
          {order.address.street}, {order.address.barangay}, {order.address.city}, {order.address.province}{" "}
          {order.address.postalCode}
        </p>
      </section>

      {/* Order Items */}
      <section className="bg-white rounded-lg border border-border-default overflow-hidden">
        <h2 className="font-semibold text-text-primary text-sm px-5 py-3 border-b border-border-default">
          Items
        </h2>
        <ul className="divide-y divide-border-default">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              {item.product.images[0] ? (
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-12 h-12 object-cover rounded border border-border-default flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-brand-50 rounded border border-border-default flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {item.product.name}
                </p>
                {item.variant && (
                  <p className="text-xs text-text-secondary">{item.variant.name}</p>
                )}
                <p className="text-xs text-text-secondary">
                  {formatPrice(item.price)} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-text-primary flex-shrink-0">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-border-default space-y-1 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span>{formatPrice(itemsTotal)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Shipping</span>
            <span>{formatPrice(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between font-semibold text-text-primary border-t border-border-default pt-1 mt-1">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </section>

      {/* Shipment Panel */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
        <h2 className="font-semibold text-text-primary text-sm">Shipment</h2>

        {order.status === "PAID" && (
          <form
            action={async (formData: FormData) => {
              "use server"
              const courier = formData.get("courier") as string
              const trackingNumber = formData.get("trackingNumber") as string
              const result = await shipOrder(order.id, courier, trackingNumber)
              if (result?.error) {
                redirect(`/seller/orders/${order.id}?error=${encodeURIComponent(result.error)}`)
              }
            }}
            className="space-y-3"
          >
            {shipError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {shipError}
              </p>
            )}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                Courier
              </label>
              <input
                name="courier"
                type="text"
                required
                placeholder="e.g. J&T Express"
                className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                Tracking Number
              </label>
              <input
                name="trackingNumber"
                type="text"
                required
                placeholder="e.g. 123456789"
                className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2 rounded text-sm transition-colors"
            >
              Mark as Shipped
            </button>
          </form>
        )}

        {order.status === "SHIPPED" && order.shipment && (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-text-secondary uppercase tracking-wide">Courier</dt>
              <dd className="text-text-primary font-medium">{order.shipment.courier ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary uppercase tracking-wide">Tracking Number</dt>
              <dd className="text-text-primary font-medium font-mono">
                {order.shipment.trackingNumber ?? "—"}
              </dd>
            </div>
          </dl>
        )}

        {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
          <p className="text-sm text-text-secondary">
            Order is {order.status.toLowerCase()}. No further shipment actions available.
          </p>
        )}
      </section>

      {/* Cancel */}
      {order.status === "PAID" && (
        <div className="flex items-center justify-end">
          <CancelOrderModal orderId={order.id} />
        </div>
      )}
    </div>
  )
}
