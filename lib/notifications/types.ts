export const NotificationType = {
  ORDER_STATUS: "ORDER_STATUS",
  REVIEW_REPLY: "REVIEW_REPLY",
  NEW_ORDER: "NEW_ORDER",
  NEW_MESSAGE: "NEW_MESSAGE",
  SHOP_VACATION: "SHOP_VACATION",
  SHOP_STAFF_ADDED: "SHOP_STAFF_ADDED",
} as const

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType]
