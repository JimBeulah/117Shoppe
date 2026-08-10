"use client"

import { useEffect, useState } from "react"
import { getOrderStatus } from "@/app/(shop)/checkout/confirmation/actions"

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Awaiting payment…", className: "text-amber-600" },
  PAID: { label: "Confirmed", className: "text-blue-600" },
  SHIPPED: { label: "Shipped", className: "text-blue-600" },
  DELIVERED: { label: "Delivered", className: "text-green-600" },
  CANCELLED: { label: "Cancelled", className: "text-red-600" },
  REFUNDED: { label: "Refunded", className: "text-red-600" },
}

export function OrderStatusLine({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus)

  useEffect(() => {
    if (status !== "PENDING") return

    const interval = setInterval(async () => {
      const result = await getOrderStatus(orderId)
      if (result && result.status !== "PENDING") {
        setStatus(result.status)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [orderId, status])

  const display = STATUS_LABEL[status] ?? { label: status, className: "text-text-primary" }

  return <span className={`font-medium ${display.className}`}>{display.label}</span>
}
