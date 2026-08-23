export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  conversationId: string
  content: string
  imageUrl: string | null
  isRead: boolean
  createdAt: string // ISO string
}

export interface ConversationItem {
  id: string
  lastMessageAt: string
  displayName: string      // shop name (buyer view) | buyer name (seller view)
  displayAvatar: string | null
  lastMessage: ChatMessage | null
  hasUnread: boolean
}
