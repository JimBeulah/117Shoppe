import { notFound } from "next/navigation"
import Link from "next/link"
import { getAdminOrderDetail } from "@/lib/admin/queries"
import { updateOrderStatus } from "@/lib/admin/actions"
import { issueRefund } from "@/lib/admin/refunds"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import { formatPrice } from "@/lib/utils"

const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await getAdminOrderDetail(id)
  if (!order) notFound()

  const canRefund =
    order.status === "PAID" &&
    order.payment?.provider === "PAYMONGO" &&
    order.payment?.status === "PAID" &&
    !order.refund

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          Order #{order.id.slice(-8).toUpperCase()}
        </h1>
        <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">
          ← Back
        </Link>
      </div>

      {/* Buyer / Shop / Status / Address */}
      <div className="bg-white rounded-lg border border-border-default p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-text-secondary">Buyer</p>
            <p className="text-sm font-medium text-text-primary">{order.user.name}</p>
            <p className="text-xs text-text-secondary">{order.user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Shop</p>
            <p className="text-sm font-medium text-text-primary">{order.shop.name}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <OrderStatusBadge status={order.status} />
            <form className="flex items-center gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                className="text-xs border border-border-default rounded px-2 py-1 bg-white text-text-primary"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  await updateOrderStatus(
                    fd.get("orderId") as string,
                    fd.get("status") as typeof ORDER_STATUSES[number]
                  )
                }}
                className="text-xs px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded cursor-pointer"
              >
                Update
              </button>
            </form>
          </div>
        </div>
        <hr className="border-border-default" />
        <div>
          <p className="text-xs text-text-secondary mb-1">Shipping Address</p>
          <p className="text-sm text-text-primary">
            {order.address.fullName} · {order.address.phone}
          </p>
          <p className="text-sm text-text-secondary">
            {order.address.street}, {order.address.barangay}, {order.address.city}, {order.address.province}{" "}
            {order.address.postalCode}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <h2 className="font-semibold text-sm text-text-primary">Items</h2>
        </div>
        <ul className="divide-y divide-border-default">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              {item.product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-10 h-10 object-cover rounded border border-border-default flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {item.product.name}
                </p>
                {item.variant && (
                  <p className="text-xs text-text-secondary">{item.variant.name}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm text-text-primary">×{item.quantity}</p>
                <p className="text-xs text-text-secondary">{formatPrice(item.price)}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-border-default flex justify-between">
          <p className="text-sm text-text-secondary">Total</p>
          <p className="text-sm font-bold text-text-primary">{formatPrice(order.total)}</p>
        </div>
      </div>

      {/* Payment */}
      {order.payment && (
        <div className="bg-white rounded-lg border border-border-default p-5 space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-text-secondary uppercase tracking-wide">Payment</p>
            <p className="text-sm text-text-primary">
              {order.payment.method} · {order.payment.status}
            </p>
            {order.payment.reference && (
              <p className="text-xs text-text-secondary">Ref: {order.payment.reference}</p>
            )}
          </div>

          {order.refund && (
            <div className="pt-2 border-t border-border-default space-y-1">
              <p className="text-xs text-text-secondary uppercase tracking-wide">Refund</p>
              <p className="text-sm text-text-primary">
                {formatPrice(order.refund.amount)} · {order.refund.status}
              </p>
              {order.refund.reason && (
                <p className="text-xs text-text-secondary">Reason: {order.refund.reason}</p>
              )}
              {order.refund.processedAt && (
                <p className="text-xs text-text-secondary">
                  Processed {order.refund.processedAt.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {canRefund && (
            <form className="pt-2 border-t border-border-default space-y-2">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="block text-xs text-text-secondary" htmlFor="reason">
                Refund reason
              </label>
              <textarea
                id="reason"
                name="reason"
                required
                rows={2}
                className="w-full text-sm border border-border-default rounded px-2 py-1 bg-white text-text-primary"
                placeholder="Why is this order being refunded?"
              />
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  await issueRefund(fd.get("orderId") as string, fd.get("reason") as string)
                }}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
              >
                Issue Refund
              </button>
            </form>
          )}
        </div>
      )}

      {/* Shipment */}
      {order.shipment && (
        <div className="bg-white rounded-lg border border-border-default p-5 space-y-1">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Shipment</p>
          <p className="text-sm text-text-primary">
            {order.shipment.courier} · {order.shipment.trackingNumber}
          </p>
          <p className="text-xs text-text-secondary">{order.shipment.status}</p>
        </div>
      )}
    </div>
  )
}
