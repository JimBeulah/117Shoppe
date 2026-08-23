import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    conversation: { findUnique: vi.fn(), update: vi.fn() },
    message: { create: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
    shopStaff: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/data/chat', () => ({ getUnreadCount: vi.fn().mockResolvedValue(0) }))
vi.mock('@/lib/data/notifications', () => ({ getUnreadNotificationCount: vi.fn().mockResolvedValue(0) }))
vi.mock('@/lib/notifications/create', () => ({ createNotification: vi.fn() }))
vi.mock('@/lib/notifications/copy', () => ({
  buildNewMessageCopy: vi.fn(() => ({ type: 'NEW_MESSAGE', title: 'New message', message: 'x', link: '/chat' })),
}))

import { prisma } from '@/lib/db'
import { setupSocketServer } from '@/lib/socket/handlers'

const USER_ID = 'user-1'
const CONVERSATION_ID = 'conv-1'

function buildMockSocket() {
  const handlers = new Map<string, (...args: any[]) => any>()
  const roomEmit = vi.fn()
  return {
    data: { userId: USER_ID },
    join: vi.fn(),
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (...args: any[]) => any) => handlers.set(event, cb)),
    to: vi.fn(() => ({ emit: roomEmit })),
    roomEmit,
    handlers,
  }
}

async function connectSocket() {
  const ioEmit = vi.fn()
  const io = {
    use: vi.fn(),
    on: vi.fn(),
    to: vi.fn(() => ({ emit: ioEmit })),
  }
  setupSocketServer(io as any)
  const connectionHandler = io.on.mock.calls.find(([event]) => event === 'connection')![1]
  const socket = buildMockSocket()
  await connectionHandler(socket)
  return { socket, io, ioEmit }
}

beforeEach(() => vi.clearAllMocks())

describe('send-message', () => {
  it('creates a message with imageUrl when provided', async () => {
    const { socket } = await connectSocket()
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      buyerId: USER_ID,
      shopId: 'shop-1',
      shop: { ownerId: 'seller-1' },
    } as any)
    vi.mocked(prisma.message.create).mockResolvedValue({
      id: 'm1',
      senderId: USER_ID,
      receiverId: 'seller-1',
      conversationId: CONVERSATION_ID,
      content: '',
      imageUrl: 'https://example.com/photo.png',
      isRead: false,
      createdAt: new Date(),
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: 'Buyer' } as any)

    const sendMessage = socket.handlers.get('send-message')!
    await sendMessage({ conversationId: CONVERSATION_ID, content: '', imageUrl: 'https://example.com/photo.png' })

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: '', imageUrl: 'https://example.com/photo.png' }),
      })
    )
  })

  it('is a no-op when content is empty and no image is provided', async () => {
    const { socket } = await connectSocket()
    const sendMessage = socket.handlers.get('send-message')!
    await sendMessage({ conversationId: CONVERSATION_ID, content: '   ' })
    expect(prisma.message.create).not.toHaveBeenCalled()
    expect(prisma.conversation.findUnique).not.toHaveBeenCalled()
  })
})

describe('typing-start / typing-stop', () => {
  it('emits user-typing to the room on typing-start', async () => {
    const { socket } = await connectSocket()
    const typingStart = socket.handlers.get('typing-start')!
    typingStart({ conversationId: CONVERSATION_ID })

    expect(socket.to).toHaveBeenCalledWith(CONVERSATION_ID)
    expect(socket.roomEmit).toHaveBeenCalledWith('user-typing', { conversationId: CONVERSATION_ID, userId: USER_ID })
  })

  it('auto-emits user-stopped-typing after the timeout if no stop event arrives', async () => {
    vi.useFakeTimers()
    const { socket } = await connectSocket()
    const typingStart = socket.handlers.get('typing-start')!
    typingStart({ conversationId: CONVERSATION_ID })

    vi.advanceTimersByTime(5000)

    expect(socket.roomEmit).toHaveBeenCalledWith('user-stopped-typing', { conversationId: CONVERSATION_ID, userId: USER_ID })
    vi.useRealTimers()
  })

  it('typing-stop clears the timeout and emits user-stopped-typing immediately', async () => {
    vi.useFakeTimers()
    const { socket } = await connectSocket()
    const typingStart = socket.handlers.get('typing-start')!
    const typingStop = socket.handlers.get('typing-stop')!

    typingStart({ conversationId: CONVERSATION_ID })
    socket.roomEmit.mockClear()
    typingStop({ conversationId: CONVERSATION_ID })

    expect(socket.roomEmit).toHaveBeenCalledWith('user-stopped-typing', { conversationId: CONVERSATION_ID, userId: USER_ID })

    socket.roomEmit.mockClear()
    vi.advanceTimersByTime(5000)
    expect(socket.roomEmit).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
