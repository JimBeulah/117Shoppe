import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getBuyerOrderDetail } from "@/lib/data/orders"
import { PrintInvoiceButton } from "@/components/account/PrintInvoiceButton"
import { formatPrice } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Invoice | 11/7 Shoppe" }

function findEventDate(events: { type: string; createdAt: Date }[], type: string): Date | null {
  return events.find((e) => e.type === type)?.createdAt ?? null
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const order = await getBuyerOrderDetail(id, user.id)
  if (!order) notFound()
  if (order.status === "PENDING" || order.status === "CANCELLED") notFound()

  const itemsTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const placedAt = findEventDate(order.timelineEvents, "ORDER_PLACED") ?? order.createdAt
  const paidAt = findEventDate(order.timelineEvents, "PAYMENT_RECEIVED")
  const deliveredAt = findEventDate(order.timelineEvents, "ORDER_DELIVERED")

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between mb-6">
        <Link href={`/account/orders/${order.id}`} className="text-sm text-text-secondary hover:underline">
          ← Back to Order
        </Link>
        <PrintInvoiceButton />
      </div>

      <div className="bg-white border border-border-default rounded-lg p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Invoice</h1>
            <p className="text-sm text-text-secondary">Order #{order.id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-text-primary">{order.shop.name}</p>
            <p className="text-xs text-text-secondary">11/7 Shoppe Marketplace</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm border-t border-b border-border-default py-4">
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Billed To</p>
            <p className="text-text-primary font-medium">{order.address.fullName}</p>
            <p className="text-text-secondary">{order.address.phone}</p>
            <p className="text-text-secondary">
              {order.address.street}, {order.address.barangay}, {order.address.city}, {order.address.province}{" "}
              {order.address.postalCode}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Order Details</p>
            <p className="text-text-secondary">Placed: {new Date(placedAt).toLocaleDateString("en-PH")}</p>
            {paidAt && <p className="text-text-secondary">Paid: {new Date(paidAt).toLocaleDateString("en-PH")}</p>}
            {deliveredAt && (
              <p className="text-text-secondary">Delivered: {new Date(deliveredAt).toLocaleDateString("en-PH")}</p>
            )}
            <p className="text-text-secondary">Payment: {order.payment?.method ?? order.paymentMethod ?? "—"}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-text-secondary">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium text-right">Unit Price</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 text-text-primary">
                  {item.product.name}
                  {item.variant && <span className="text-text-secondary"> ({item.variant.name})</span>}
                </td>
                <td className="py-2 text-right text-text-secondary">{formatPrice(item.price)}</td>
                <td className="py-2 text-right text-text-secondary">{item.quantity}</td>
                <td className="py-2 text-right text-text-primary font-medium">
                  {formatPrice(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>{formatPrice(itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Shipping</span>
              <span>{formatPrice(order.shippingFee)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Discount</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-text-primary border-t border-border-default pt-1 mt-1">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-text-secondary border-t border-border-default pt-4">
          Thank you for shopping with 11/7 Shoppe!
        </p>
      </div>
    </div>
  )
}
