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

export function buildShopVacationEndCopy(shopName: string, shopSlug: string) {
  return {
    type: NotificationType.SHOP_VACATION,
    title: "Seller is back!",
    message: `${shopName} is back from vacation and accepting orders again.`,
    link: `/shop/${shopSlug}` as string | null,
  }
}

export function buildStaffAddedCopy(shopName: string) {
  return {
    type: NotificationType.SHOP_STAFF_ADDED,
    title: "You've been added as staff",
    message: `You now have staff access to ${shopName}'s Seller Centre.`,
    link: "/seller/dashboard" as string | null,
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

export function buildReturnRequestedCopy(orderId: string, buyerName: string) {
  return {
    type: NotificationType.RETURN_STATUS,
    title: "New return/refund request",
    message: `${buyerName} requested a return/refund for order ${shortId(orderId)}.`,
    link: `/seller/orders/${orderId}`,
  }
}

export function buildReturnSellerApprovedCopy(orderId: string) {
  return {
    type: NotificationType.RETURN_STATUS,
    title: "Return/refund approved",
    message: `Your return/refund request for order ${shortId(orderId)} was approved by the seller.`,
    link: `/account/orders/${orderId}`,
  }
}

export function buildReturnSellerRejectedCopy(orderId: string) {
  return {
    type: NotificationType.RETURN_STATUS,
    title: "Return/refund declined by seller",
    message: `The seller declined your return/refund request for order ${shortId(orderId)}. It's been forwarded to platform support for review.`,
    link: `/account/orders/${orderId}`,
  }
}

export function buildReturnEscalatedCopy(orderId: string) {
  return {
    type: NotificationType.RETURN_STATUS,
    title: "Return/refund under platform review",
    message: `Your return/refund request for order ${shortId(orderId)} is now being reviewed by platform support.`,
    link: `/account/orders/${orderId}`,
  }
}

export function buildReturnAdminApprovedCopy(orderId: string) {
  return {
    type: NotificationType.RETURN_STATUS,
    title: "Return/refund approved",
    message: `Your return/refund request for order ${shortId(orderId)} was approved.`,
    link: `/account/orders/${orderId}`,
  }
}

export function buildReturnAdminRejectedCopy(orderId: string) {
  return {
    type: NotificationType.RETURN_STATUS,
    title: "Return/refund request denied",
    message: `Your return/refund request for order ${shortId(orderId)} was denied after platform review.`,
    link: `/account/orders/${orderId}`,
  }
}

export function buildReturnCancelledCopy(orderId: string, buyerName: string) {
  return {
    type: NotificationType.RETURN_STATUS,
    title: "Return/refund request withdrawn",
    message: `${buyerName} withdrew their return/refund request for order ${shortId(orderId)}.`,
    link: `/seller/orders/${orderId}`,
  }
}

export function buildPriceDropCopy(productName: string, productSlug: string, oldPrice: number, newPrice: number) {
  return {
    type: NotificationType.PRICE_DROP,
    title: "Price drop on your saved item",
    message: `"${productName}" dropped from ₱${oldPrice.toFixed(2)} to ₱${newPrice.toFixed(2)}.`,
    link: `/product/${productSlug}` as string | null,
  }
}

export function buildCoinsEarnedCopy(orderId: string, coins: number) {
  return {
    type: NotificationType.COINS_EARNED,
    title: "Coins earned",
    message: `You earned ${coins.toLocaleString()} coins from order ${shortId(orderId)}.`,
    link: "/account/coins" as string | null,
  }
}

export function buildReturnRefundCompletedCopy(orderId: string) {
  return {
    type: NotificationType.RETURN_STATUS,
    title: "Refund issued",
    message: `A refund has been issued for order ${shortId(orderId)}.`,
    link: `/account/orders/${orderId}`,
  }
}
