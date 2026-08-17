import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getBuyerOrderDetail } from "@/lib/data/orders"
import { OrderActions } from "@/components/account/OrderActions"
import { ReturnRequestForm } from "@/components/account/ReturnRequestForm"
import { ReturnRequestStatus } from "@/components/account/ReturnRequestStatus"
import { OrderTimeline } from "@/components/orders/OrderTimeline"
import { canRequestReturn } from "@/lib/orders/eligibility"
import { formatPrice } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-600",
}

const TRACKING_STEPS = ["PAID", "SHIPPED", "DELIVERED"] as const

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery Failed",
}

export const metadata = { title: "Order Details | 11/7 Shoppe" }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const order = await getBuyerOrderDetail(id, user.id)
  if (!order) notFound()

  const itemsTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED"
  const currentStepIndex = TRACKING_STEPS.indexOf(order.status as (typeof TRACKING_STEPS)[number])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/account/orders" className="text-sm text-text-secondary hover:underline">
            ← My Purchases
          </Link>
          <h1 className="text-xl font-bold text-text-primary mt-1">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-text-secondary">{order.shop.name}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          {order.status !== "PENDING" && order.status !== "CANCELLED" && (
            <Link
              href={`/account/orders/${order.id}/invoice`}
              className="text-xs text-text-secondary hover:underline"
            >
              View Invoice
            </Link>
          )}
        </div>
      </div>

      {/* Tracking */}
      {!isCancelled && (
        <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
          <h2 className="font-semibold text-text-primary text-sm">Tracking</h2>
          <div className="flex items-center">
            {TRACKING_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      i <= currentStepIndex
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-xs ${i <= currentStepIndex ? "text-text-primary font-medium" : "text-text-secondary"}`}
                  >
                    {STATUS_LABELS[step]}
                  </span>
                </div>
                {i < TRACKING_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${i < currentStepIndex ? "bg-brand-600" : "bg-gray-100"}`}
                  />
                )}
              </div>
            ))}
          </div>

          {(order.shipment || order.shippingMethodName) && (
            <dl className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border-default">
              {order.shippingMethodName && (
                <div>
                  <dt className="text-xs text-text-secondary uppercase tracking-wide">Shipping Method</dt>
                  <dd className="text-text-primary font-medium">{order.shippingMethodName}</dd>
                </div>
              )}
              {order.shipment && (order.shipment.courier || order.shipment.trackingNumber) && (
                <>
                  <div>
                    <dt className="text-xs text-text-secondary uppercase tracking-wide">Courier</dt>
                    <dd className="text-text-primary font-medium">{order.shipment.courier ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary uppercase tracking-wide">
                      Tracking Number
                    </dt>
                    <dd className="text-text-primary font-medium font-mono">
                      {order.shipment.trackingNumber ?? "—"}
                    </dd>
                  </div>
                </>
              )}
              {order.shipment && (
                <div>
                  <dt className="text-xs text-text-secondary uppercase tracking-wide">Delivery Status</dt>
                  <dd className="text-text-primary font-medium">
                    {DELIVERY_STATUS_LABEL[order.shipment.status] ?? order.shipment.status}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </section>
      )}

      {isCancelled && (
        <section className="bg-white rounded-lg border border-border-default p-5">
          <p className="text-sm text-text-secondary">
            This order was {order.status.toLowerCase()}.
          </p>
        </section>
      )}

      {/* Shipping Address */}
      <section className="bg-white rounded-lg border border-border-default p-5 space-y-2">
        <h2 className="font-semibold text-text-primary text-sm">Shipping Address</h2>
        <p className="text-sm text-text-primary">{order.address.fullName}</p>
        <p className="text-sm text-text-secondary">{order.address.phone}</p>
        <p className="text-sm text-text-secondary">
          {order.address.street}, {order.address.barangay}, {order.address.city},{" "}
          {order.address.province} {order.address.postalCode}
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

      {order.returnRequest ? (
        <ReturnRequestStatus
          orderId={order.id}
          status={order.returnRequest.status}
          sellerDecisionNote={order.returnRequest.sellerDecisionNote}
          adminDecisionNote={order.returnRequest.adminDecisionNote}
        />
      ) : (
        canRequestReturn(order) && (
          <div className="flex justify-end">
            <ReturnRequestForm orderId={order.id} />
          </div>
        )
      )}

      <OrderActions orderId={order.id} status={order.status} />

      <OrderTimeline events={order.timelineEvents} />
    </div>
  )
}
