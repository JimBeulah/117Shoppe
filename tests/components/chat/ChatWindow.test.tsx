import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@uploadthing/react', () => ({
  generateReactHelpers: () => ({
    useUploadThing: () => ({ startUpload: vi.fn(), isUploading: false }),
  }),
}))
vi.mock('emoji-picker-react', () => ({ default: () => null }))

function createFakeSocket() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>()
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(cb)
    }),
    off: vi.fn((event: string, cb: (...args: any[]) => void) => {
      listeners.get(event)?.delete(cb)
    }),
    trigger(event: string, payload: unknown) {
      listeners.get(event)?.forEach(cb => cb(payload))
    },
  }
}

const fakeSocket = createFakeSocket()

vi.mock('@/hooks/use-socket', () => ({
  useSocket: () => ({ socket: fakeSocket, connected: true }),
}))

import { ChatWindow } from '@/components/chat/ChatWindow'

function renderWindow() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ChatWindow conversationId="conv-1" currentUserId="u1" displayName="Cool Shop" />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }) as any
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ChatWindow', () => {
  it('shows a typing indicator when the other user starts typing', async () => {
    renderWindow()
    await waitFor(() => expect(fakeSocket.emit).toHaveBeenCalledWith('join-room', { conversationId: 'conv-1' }))

    fakeSocket.trigger('user-typing', { conversationId: 'conv-1', userId: 'other-user' })
    expect(await screen.findByText('Cool Shop is typing…')).toBeDefined()
  })

  it('hides the typing indicator when the other user stops typing', async () => {
    renderWindow()
    await waitFor(() => expect(fakeSocket.emit).toHaveBeenCalledWith('join-room', { conversationId: 'conv-1' }))

    fakeSocket.trigger('user-typing', { conversationId: 'conv-1', userId: 'other-user' })
    expect(await screen.findByText('Cool Shop is typing…')).toBeDefined()

    fakeSocket.trigger('user-stopped-typing', { conversationId: 'conv-1', userId: 'other-user' })
    await waitFor(() => expect(screen.queryByText('Cool Shop is typing…')).toBeNull())
  })

  it('ignores typing events from the current user', async () => {
    renderWindow()
    await waitFor(() => expect(fakeSocket.emit).toHaveBeenCalledWith('join-room', { conversationId: 'conv-1' }))

    fakeSocket.trigger('user-typing', { conversationId: 'conv-1', userId: 'u1' })
    expect(screen.queryByText('Cool Shop is typing…')).toBeNull()
  })
})
