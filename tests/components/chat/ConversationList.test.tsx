import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ConversationItem } from '@/types/chat'

vi.mock('@/hooks/use-socket', () => ({ useSocket: () => ({ socket: null, connected: false }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/image', () => ({ default: (props: any) => <img {...props} /> }))

import { ConversationList } from '@/components/chat/ConversationList'

const item: ConversationItem = {
  id: 'conv-1',
  lastMessageAt: new Date().toISOString(),
  displayName: 'Cool Shop',
  displayAvatar: null,
  lastMessage: {
    id: 'm1',
    senderId: 'u1',
    receiverId: 'u2',
    conversationId: 'conv-1',
    content: 'Hello there',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  hasUnread: true,
}

describe('ConversationList', () => {
  it('renders conversation display name', () => {
    render(<ConversationList conversations={[item]} currentUserId="u2" />)
    expect(screen.getByText('Cool Shop')).toBeDefined()
  })

  it('renders last message preview', () => {
    render(<ConversationList conversations={[item]} currentUserId="u2" />)
    expect(screen.getByText('Hello there')).toBeDefined()
  })

  it('shows unread indicator when hasUnread is true', () => {
    render(<ConversationList conversations={[item]} currentUserId="u2" />)
    expect(document.querySelector('[data-unread]')).not.toBeNull()
  })

  it('renders empty state when no conversations', () => {
    render(<ConversationList conversations={[]} currentUserId="u2" />)
    expect(screen.getByText(/no conversations/i)).toBeDefined()
  })
})
