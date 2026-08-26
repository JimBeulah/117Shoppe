import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ChatMessage } from '@/types/chat'

vi.mock('@uploadthing/react', () => ({
  generateReactHelpers: () => ({
    useUploadThing: () => ({ startUpload: vi.fn(), isUploading: false }),
  }),
}))
vi.mock('emoji-picker-react', () => ({ default: () => null }))

import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'

const msg: ChatMessage = {
  id: 'm1',
  senderId: 'u1',
  receiverId: 'u2',
  conversationId: 'c1',
  content: 'Hello!',
  imageUrl: null,
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

  it('renders an image when imageUrl is set', () => {
    const imageMsg: ChatMessage = { ...msg, content: '', imageUrl: 'https://example.com/photo.png' }
    render(<MessageBubble message={imageMsg} isOwn={false} />)
    const img = screen.getByAltText('Sent image') as HTMLImageElement
    // next/image rewrites src through the optimizer loader — assert the
    // original URL is embedded rather than an exact string match.
    expect(img.src).toContain(encodeURIComponent('https://example.com/photo.png'))
    expect(screen.queryByText('Hello!')).toBeNull()
  })

  it('renders both image and caption when both are present', () => {
    const imageMsg: ChatMessage = { ...msg, content: 'Check this out', imageUrl: 'https://example.com/photo.png' }
    render(<MessageBubble message={imageMsg} isOwn={false} />)
    expect(screen.getByAltText('Sent image')).toBeDefined()
    expect(screen.getByText('Check this out')).toBeDefined()
  })
})

describe('ChatInput', () => {
  it('calls onSend with content on button click', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hi there' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('Hi there', null)
  })

  it('does not call onSend with empty content', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('clears textarea after send', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(textarea.value).toBe('')
  })

  it('emits typing-start on change and typing-stop after debounce', () => {
    vi.useFakeTimers()
    const onTypingStart = vi.fn()
    const onTypingStop = vi.fn()
    render(<ChatInput onSend={vi.fn()} onTypingStart={onTypingStart} onTypingStop={onTypingStop} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'H' } })
    expect(onTypingStart).toHaveBeenCalledTimes(1)

    fireEvent.change(textarea, { target: { value: 'He' } })
    expect(onTypingStart).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2000)
    expect(onTypingStop).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('emits typing-stop immediately on send', () => {
    vi.useFakeTimers()
    const onSend = vi.fn()
    const onTypingStop = vi.fn()
    render(<ChatInput onSend={onSend} onTypingStop={onTypingStop} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onTypingStop).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
