export const NotificationType = {
  ORDER_STATUS: "ORDER_STATUS",
  REVIEW_REPLY: "REVIEW_REPLY",
  NEW_ORDER: "NEW_ORDER",
  NEW_MESSAGE: "NEW_MESSAGE",
} as const

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType]
