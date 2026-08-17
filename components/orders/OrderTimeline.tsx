const EVENT_LABELS: Record<string, string> = {
  ORDER_PLACED: "Order Placed",
  PAYMENT_RECEIVED: "Payment Received",
  ORDER_SHIPPED: "Order Shipped",
  DELIVERY_STATUS_UPDATED: "Delivery Update",
  ORDER_DELIVERED: "Order Delivered",
  ORDER_CANCELLED: "Order Cancelled",
  RETURN_REQUESTED: "Return/Refund Requested",
  RETURN_SELLER_APPROVED: "Return Approved by Seller",
  RETURN_SELLER_REJECTED: "Return Declined by Seller",
  RETURN_ESCALATED_TO_ADMIN: "Escalated to Platform Support",
  RETURN_ADMIN_APPROVED: "Return Approved by Admin",
  RETURN_ADMIN_REJECTED: "Return Denied by Admin",
  RETURN_CANCELLED_BY_BUYER: "Return Withdrawn",
  REFUND_ISSUED: "Refund Issued",
  ORDER_STATUS_CHANGED_BY_ADMIN: "Status Changed by Admin",
}

const NEGATIVE_EVENTS = new Set([
  "ORDER_CANCELLED",
  "RETURN_SELLER_REJECTED",
  "RETURN_ADMIN_REJECTED",
])

interface TimelineEvent {
  id: string
  type: string
  message: string
  createdAt: Date | string
  actorRole?: string | null
}

interface Props {
  events: TimelineEvent[]
}

export function OrderTimeline({ events }: Props) {
  if (events.length === 0) return null

  return (
    <section className="bg-white rounded-lg border border-border-default p-5">
      <h2 className="font-semibold text-text-primary text-sm mb-4">Order Timeline</h2>
      <ol className="space-y-4">
        {events.map((event, i) => {
          const isLast = i === events.length - 1
          const isNegative = NEGATIVE_EVENTS.has(event.type)
          return (
            <li key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                    isNegative ? "bg-red-500" : "bg-brand-600"
                  }`}
                />
                {!isLast && <div className="w-px flex-1 bg-border-default mt-1" />}
              </div>
              <div className="pb-1">
                <p className="text-sm font-medium text-text-primary">
                  {EVENT_LABELS[event.type] ?? event.type}
                </p>
                <p className="text-sm text-text-secondary">{event.message}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {new Date(event.createdAt).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {event.actorRole ? ` · ${event.actorRole.charAt(0)}${event.actorRole.slice(1).toLowerCase()}` : ""}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
