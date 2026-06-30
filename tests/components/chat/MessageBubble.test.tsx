import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ChatMessage } from '@/types/chat'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'

const msg: ChatMessage = {
  id: 'm1',
  senderId: 'u1',
  receiverId: 'u2',
  conversationId: 'c1',
  content: 'Hello!',
  isRead: false,
  createdAt: new Date().toISOString(),
}

describe('MessageBubble', () => {
  it('renders message content', () => {
    render(<MessageBubble message={msg} isOwn={false} />)
    expect(screen.getByText('Hello!')).toBeDefined()
  })

  it('applies different styles for own vs other messages', () => {
    const { container: c1 } = render(<MessageBubble message={msg} isOwn={true} />)
    const { container: c2 } = render(<MessageBubble message={msg} isOwn={false} />)
    expect(c1.innerHTML).not.toBe(c2.innerHTML)
  })
})

describe('ChatInput', () => {
  it('calls onSend with content on button click', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hi there' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('Hi there')
  })

  it('does not call onSend with empty content', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('clears textarea after send', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(textarea.value).toBe('')
  })
})
