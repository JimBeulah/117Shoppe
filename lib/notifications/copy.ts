import { NotificationType } from "@/lib/notifications/types"

function shortId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`
}

const ORDER_STATUS_COPY: Record<string, { title: string; message: (id: string) => string }> = {
  PAID: {
    title: "Order confirmed",
    message: (id) => `Your order ${shortId(id)} has been confirmed and is being prepared.`,
  },
  SHIPPED: {
    title: "Order shipped",
    message: (id) => `Your order ${shortId(id)} is on its way!`,
  },
  DELIVERED: {
    title: "Order delivered",
    message: (id) => `Your order ${shortId(id)} has been delivered. Enjoy!`,
  },
  CANCELLED: {
    title: "Order cancelled",
    message: (id) => `Your order ${shortId(id)} was cancelled.`,
  },
  REFUNDED: {
    title: "Order refunded",
    message: (id) => `Your order ${shortId(id)} has been refunded.`,
  },
}

export function buildOrderStatusCopy(orderId: string, status: string) {
  const entry = ORDER_STATUS_COPY[status]
  if (!entry) return null

  return {
    type: NotificationType.ORDER_STATUS,
    title: entry.title,
    message: entry.message(orderId),
    link: "/account/orders",
  }
}

export function buildReviewReplyCopy(productName: string) {
  return {
    type: NotificationType.REVIEW_REPLY,
    title: "Seller replied to your review",
    message: `The seller replied to your review on "${productName}".`,
    link: null as string | null,
  }
}

export function buildNewOrderCopy(orderId: string, buyerName: string) {
  return {
    type: NotificationType.NEW_ORDER,
    title: "New order received",
    message: `${buyerName} placed a new order ${shortId(orderId)}.`,
    link: `/seller/orders/${orderId}`,
  }
}

export function buildBuyerCancelledCopy(orderId: string, buyerName: string) {
  return {
    type: NotificationType.ORDER_STATUS,
    title: "Order cancelled by buyer",
    message: `${buyerName} cancelled order ${shortId(orderId)}.`,
    link: `/seller/orders/${orderId}`,
  }
}

export function buildOrderReceivedCopy(orderId: string, buyerName: string) {
  return {
    type: NotificationType.ORDER_STATUS,
    title: "Order marked as received",
    message: `${buyerName} confirmed receipt of order ${shortId(orderId)}.`,
    link: `/seller/orders/${orderId}`,
  }
}

export function buildPayoutPaidCopy(payoutId: string, amount: number) {
  return {
    type: NotificationType.ORDER_STATUS,
    title: "Payout sent",
    message: `Your payout of ₱${amount.toFixed(2)} (${shortId(payoutId)}) has been marked as paid.`,
    link: "/seller/payouts",
  }
}

export function buildPayoutRejectedCopy(payoutId: string, reason: string) {
  return {
    type: NotificationType.ORDER_STATUS,
    title: "Payout request rejected",
    message: `Your payout request ${shortId(payoutId)} was rejected: ${reason}`,
    link: "/seller/payouts",
  }
}

export function buildNewMessageCopy(senderName: string) {
  return {
    type: NotificationType.NEW_MESSAGE,
    title: "New message",
    message: `${senderName} sent you a message.`,
    link: "/chat",
  }
}
