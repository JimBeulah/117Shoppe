import Image from "next/image"
import Link from "next/link"
import { RateButton } from "@/components/reviews/RateButton"
import type { OrderWithItems } from "@/types"

interface OrderCardProps {
  order: OrderWithItems
  reviewedProductIds: Set<string>
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export function OrderCard({ order, reviewedProductIds }: OrderCardProps) {
  return (
    <div className="bg-white border border-border-default rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-page">
        <span className="text-sm font-medium text-text-primary">{order.shop.name}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="divide-y divide-border-default">
        {order.items.map((item) => {
          const isDelivered = order.status === "DELIVERED"
          const hasReviewed = reviewedProductIds.has(item.product.id)
          const image = item.product.images[0]

          return (
            <div key={item.id} className="flex items-center gap-4 px-4 py-4">
              {image && (
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image src={image} alt={item.product.name} fill className="object-cover rounded" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary line-clamp-2">{item.product.name}</p>
                {item.variant && (
                  <p className="text-xs text-text-secondary mt-0.5">{item.variant.name}</p>
                )}
                <p className="text-xs text-text-secondary mt-0.5">Qty: {item.quantity}</p>
              </div>
              <div className="flex-shrink-0">
                {isDelivered && !hasReviewed && (
                  <RateButton
                    productId={item.product.id}
                    productSlug={item.product.slug}
                    productName={item.product.name}
                    orderId={order.id}
                  />
                )}
                {isDelivered && hasReviewed && (
                  <span className="text-xs text-text-secondary border border-border-default rounded px-2 py-1">
                    Reviewed
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-border-default flex items-center justify-between text-xs text-text-secondary">
        <span>
          {new Date(order.createdAt).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className="font-medium text-text-primary">
          Total: ₱{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="px-4 py-3 border-t border-border-default flex justify-end">
        <Link
          href={`/account/orders/${order.id}`}
          className="text-sm text-brand-600 hover:underline font-medium"
        >
          View Order Details →
        </Link>
      </div>
    </div>
  )
}
