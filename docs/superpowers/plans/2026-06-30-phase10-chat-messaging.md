# Phase 10: Chat / Messaging — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time buyer–seller chat via Socket.IO — a dedicated `/chat` inbox for buyers, `/seller/chat` for sellers, a "Chat with Seller" button on the product page, and an unread badge in the Navbar.

**Architecture:** A `server.ts` at the project root replaces `next start`, mounting Socket.IO on the same HTTP server as Next.js. The Prisma schema already has `Conversation` and `Message` models — no migrations needed. Each conversation has a socket room (`conversationId`) and each user has a personal room (`user:{userId}`) for targeted events like unread count.

**Tech Stack:** Socket.IO 4.x (`socket.io` server + `socket.io-client` client), Next.js 16 App Router, Prisma 7, Clerk v7, Vitest 4, Tailwind v4, React 19, tsx (already installed) for running `server.ts`.

## Global Constraints

- Import Prisma client from `@/lib/generated/prisma/client` (not `@prisma/client`) — see `lib/db.ts`
- Auth: always call `getCurrentUser()` from `@/lib/data/user` for server auth; for socket auth use `verifyToken` from `@clerk/backend` with `{ secretKey: process.env.CLERK_SECRET_KEY! }`
- All server actions must have `"use server"` directive and return `{ error?: string }` or call `redirect()`
- Date fields from Prisma are `Date` objects — call `.toISOString()` before passing to client components as props
- Path alias `@/` maps to project root (configured in both `tsconfig.json` and `vitest.config.ts`)
- Run tests with: `npm test` (runs `vitest run`)
- No `date-fns` in project — format dates with plain JS
- Socket.IO path: `/socket.io` (default)
- Railway deploy: build command `npm run build`, start command `npm start`

---

## File Map

**Create:**
- `server.ts` — custom HTTP server booting Next.js + Socket.IO
- `types/chat.ts` — shared TypeScript types for chat
- `lib/data/chat.ts` — Prisma query functions
- `lib/socket/handlers.ts` — Socket.IO auth middleware + event handlers
- `lib/socket/client.ts` — client-side socket singleton
- `lib/chat/actions.ts` — `startConversation` server action
- `hooks/use-socket.ts` — React hook for socket lifecycle
- `app/api/conversations/route.ts` — GET conversation list
- `app/api/conversations/[id]/messages/route.ts` — GET paginated messages
- `components/chat/ConversationList.tsx` — sidebar with conversation rows
- `components/chat/MessageBubble.tsx` — individual message bubble
- `components/chat/ChatInput.tsx` — textarea + send button
- `components/chat/ChatWindow.tsx` — full message thread
- `components/chat/UnreadBadge.tsx` — chat icon with live unread count for Navbar
- `app/(shop)/chat/page.tsx` — buyer chat inbox
- `app/(seller)/seller/(portal)/chat/page.tsx` — seller chat inbox
- `tests/lib/data/chat.test.ts` — unit tests for DB queries
- `tests/lib/chat/actions.test.ts` — unit test for server action
- `tests/api/conversations.test.ts` — unit tests for API routes
- `tests/components/chat/ConversationList.test.tsx` — component test
- `tests/components/chat/MessageBubble.test.tsx` — component test

**Modify:**
- `package.json` — add `socket.io`, `socket.io-client`; update `dev` and `start` scripts
- `components/layout/Navbar.tsx` — add `UnreadBadge` chat icon
- `components/product/ShopPanel.tsx` — add "Chat with Seller" button
- `components/seller/SellerSidebar.tsx` — add Chat nav link

---

### Task 1: Install Socket.IO, create server.ts, add shared types

**Files:**
- Create: `server.ts`
- Create: `types/chat.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ChatMessage`, `ConversationItem` types used by all later tasks

- [ ] **Step 1: Install Socket.IO packages**

```bash
npm install socket.io socket.io-client
```

Expected: `socket.io` and `socket.io-client` appear in `package.json` dependencies.

- [ ] **Step 2: Create `types/chat.ts`**

```ts
export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  conversationId: string
  content: string
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
```

- [ ] **Step 3: Create `server.ts`**

```ts
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { setupSocketServer } from '@/lib/socket/handlers'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

async function main() {
  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()

  await app.prepare()

  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true)
    await handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer)

  setupSocketServer(io)

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
}

main()
```

- [ ] **Step 4: Update `package.json` scripts**

Replace the `dev` and `start` lines:

```json
"dev": "tsx watch server.ts",
"start": "tsx server.ts",
```

- [ ] **Step 5: Verify server boots**

```bash
npm run dev
```

Expected: `> Ready on http://localhost:3000` in the terminal. The Next.js app should be accessible at `http://localhost:3000`.

- [ ] **Step 6: Commit**

```bash
git add server.ts types/chat.ts package.json package-lock.json
git commit -m "feat(chat): add Socket.IO custom server and shared chat types"
```

---

### Task 2: DB query functions

**Files:**
- Create: `lib/data/chat.ts`
- Create: `tests/lib/data/chat.test.ts`

**Interfaces:**
- Produces:
  - `getConversationsForBuyer(buyerId: string)` → Prisma conversation array with `shop`, `messages[0]`
  - `getConversationsForSeller(shopId: string)` → Prisma conversation array with `buyer`, `messages[0]`
  - `getMessages(conversationId: string, page?: number, pageSize?: number)` → message array
  - `getUnreadCount(userId: string)` → `number`
  - `findOrCreateConversation(buyerId: string, shopId: string)` → `{ id: string }`

- [ ] **Step 1: Write failing tests**

```ts
// tests/lib/data/chat.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import {
  getConversationsForBuyer,
  getConversationsForSeller,
  getMessages,
  getUnreadCount,
  findOrCreateConversation,
} from '@/lib/data/chat'

const mockMessage = {
  id: 'm1',
  senderId: 'u1',
  receiverId: 'u2',
  content: 'Hello',
  isRead: false,
  createdAt: new Date('2026-06-30T10:00:00Z'),
}

beforeEach(() => vi.clearAllMocks())

describe('getConversationsForBuyer', () => {
  it('queries by buyerId ordered by lastMessageAt desc', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([])
    await getConversationsForBuyer('buyer-1')
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { buyerId: 'buyer-1' },
        orderBy: { lastMessageAt: 'desc' },
      })
    )
  })
})

describe('getConversationsForSeller', () => {
  it('queries by shopId ordered by lastMessageAt desc', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([])
    await getConversationsForSeller('shop-1')
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopId: 'shop-1' },
        orderBy: { lastMessageAt: 'desc' },
      })
    )
  })
})

describe('getMessages', () => {
  it('fetches page 1 with default page size 30', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    await getMessages('conv-1')
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'asc' },
        skip: 0,
        take: 30,
      })
    )
  })

  it('calculates correct skip for page 2', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    await getMessages('conv-1', 2)
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 30, take: 30 })
    )
  })
})

describe('getUnreadCount', () => {
  it('counts unread messages for receiver', async () => {
    vi.mocked(prisma.message.count).mockResolvedValue(3)
    const result = await getUnreadCount('user-1')
    expect(result).toBe(3)
    expect(prisma.message.count).toHaveBeenCalledWith({
      where: { receiverId: 'user-1', isRead: false },
    })
  })
})

describe('findOrCreateConversation', () => {
  it('upserts by buyerId + shopId and returns id', async () => {
    vi.mocked(prisma.conversation.upsert).mockResolvedValue({ id: 'conv-1' } as any)
    const result = await findOrCreateConversation('buyer-1', 'shop-1')
    expect(result).toEqual({ id: 'conv-1' })
    expect(prisma.conversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { buyerId_shopId: { buyerId: 'buyer-1', shopId: 'shop-1' } },
      })
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test tests/lib/data/chat.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/data/chat'`

- [ ] **Step 3: Create `lib/data/chat.ts`**

```ts
import { prisma } from '@/lib/db'

const MESSAGE_SELECT = {
  id: true,
  senderId: true,
  receiverId: true,
  conversationId: true,
  content: true,
  isRead: true,
  createdAt: true,
} as const

export async function getConversationsForBuyer(buyerId: string) {
  return prisma.conversation.findMany({
    where: { buyerId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      shop: { select: { id: true, name: true, slug: true, logo: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: MESSAGE_SELECT,
      },
    },
  })
}

export async function getConversationsForSeller(shopId: string) {
  return prisma.conversation.findMany({
    where: { shopId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      buyer: { select: { id: true, name: true, avatar: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: MESSAGE_SELECT,
      },
    },
  })
}

export async function getMessages(conversationId: string, page = 1, pageSize = 30) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: MESSAGE_SELECT,
  })
}

export async function getUnreadCount(userId: string) {
  return prisma.message.count({ where: { receiverId: userId, isRead: false } })
}

export async function findOrCreateConversation(buyerId: string, shopId: string) {
  return prisma.conversation.upsert({
    where: { buyerId_shopId: { buyerId, shopId } },
    create: { buyerId, shopId },
    update: {},
    select: { id: true },
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test tests/lib/data/chat.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/data/chat.ts tests/lib/data/chat.test.ts
git commit -m "feat(chat): add DB query functions for conversations and messages"
```

---

### Task 3: Socket.IO server event handlers

**Files:**
- Create: `lib/socket/handlers.ts`

**Interfaces:**
- Consumes: `getUnreadCount(userId)` from `@/lib/data/chat`; `prisma` from `@/lib/db`; `verifyToken` from `@clerk/backend`
- Produces: `setupSocketServer(io: Server): void` — call once from `server.ts`

- [ ] **Step 1: Create `lib/socket/handlers.ts`**

```ts
import type { Server, Socket } from 'socket.io'
import { verifyToken } from '@clerk/backend'
import { prisma } from '@/lib/db'
import { getUnreadCount } from '@/lib/data/chat'

interface AuthSocket extends Socket {
  data: { userId: string }
}

export function setupSocketServer(io: Server) {
  // Auth middleware — runs before every connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Unauthorized'))

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      })
      const user = await prisma.user.findUnique({
        where: { clerkId: payload.sub },
        select: { id: true },
      })
      if (!user) return next(new Error('User not found'))
      socket.data.userId = user.id
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.data.userId

    // Join personal room so we can target this user for unread-count events
    socket.join(`user:${userId}`)

    // Push initial unread count on connect
    const initial = await getUnreadCount(userId)
    socket.emit('unread-count', { count: initial })

    // Join a conversation room (called when user opens a chat)
    socket.on('join-room', async ({ conversationId }: { conversationId: string }) => {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { shop: { select: { ownerId: true } } },
      })
      if (!conversation) return socket.emit('error', 'Conversation not found')

      const isBuyer = conversation.buyerId === userId
      const isSeller = conversation.shop.ownerId === userId
      if (!isBuyer && !isSeller) return socket.emit('error', 'Unauthorized')

      socket.join(conversationId)
    })

    // Send a message
    socket.on(
      'send-message',
      async ({ conversationId, content }: { conversationId: string; content: string }) => {
        if (!content?.trim()) return

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { shop: { select: { ownerId: true } } },
        })
        if (!conversation) return socket.emit('error', 'Conversation not found')

        const isBuyer = conversation.buyerId === userId
        const isSeller = conversation.shop.ownerId === userId
        if (!isBuyer && !isSeller) return socket.emit('error', 'Unauthorized')

        const receiverId = isBuyer ? conversation.shop.ownerId : conversation.buyerId

        const message = await prisma.message.create({
          data: { senderId: userId, receiverId, conversationId, content: content.trim() },
          select: { id: true, senderId: true, receiverId: true, conversationId: true, content: true, isRead: true, createdAt: true },
        })

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        })

        io.to(conversationId).emit('new-message', {
          ...message,
          createdAt: message.createdAt.toISOString(),
        })

        // Update receiver's unread count
        const count = await getUnreadCount(receiverId)
        io.to(`user:${receiverId}`).emit('unread-count', { count })
      }
    )

    // Mark messages in a conversation as read
    socket.on('mark-read', async ({ conversationId }: { conversationId: string }) => {
      await prisma.message.updateMany({
        where: { conversationId, receiverId: userId, isRead: false },
        data: { isRead: true },
      })

      io.to(conversationId).emit('message-read', { conversationId })

      const count = await getUnreadCount(userId)
      io.to(`user:${userId}`).emit('unread-count', { count })
    })
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors in `lib/socket/handlers.ts`.

- [ ] **Step 3: Smoke-test in dev**

Start the dev server (`npm run dev`), open `http://localhost:3000`, check the terminal for errors. Expected: no `Cannot find module` or TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/socket/handlers.ts
git commit -m "feat(chat): add Socket.IO server event handlers"
```

---

### Task 4: API routes for initial data load

**Files:**
- Create: `app/api/conversations/route.ts`
- Create: `app/api/conversations/[id]/messages/route.ts`
- Create: `tests/api/conversations.test.ts`

**Interfaces:**
- Consumes: `getCurrentUser()`, `getCurrentShop()`, `getConversationsForBuyer()`, `getConversationsForSeller()`, `getMessages()` from previous tasks
- Produces:
  - `GET /api/conversations?role=buyer` → JSON array of buyer conversations
  - `GET /api/conversations?role=seller` → JSON array of seller conversations
  - `GET /api/conversations/[id]/messages?page=1` → JSON array of messages

- [ ] **Step 1: Write failing tests**

```ts
// tests/api/conversations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/data/user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/seller/queries', () => ({ getCurrentShop: vi.fn() }))
vi.mock('@/lib/data/chat', () => ({
  getConversationsForBuyer: vi.fn(),
  getConversationsForSeller: vi.fn(),
  getMessages: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ prisma: { conversation: { findUnique: vi.fn() } } }))

import { getCurrentUser } from '@/lib/data/user'
import { getCurrentShop } from '@/lib/seller/queries'
import { getConversationsForBuyer, getConversationsForSeller, getMessages } from '@/lib/data/chat'
import { prisma } from '@/lib/db'
import { GET as getConversations } from '@/app/api/conversations/route'
import { GET as getMessagesRoute } from '@/app/api/conversations/[id]/messages/route'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/conversations', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/conversations?role=buyer')
    const res = await getConversations(req)
    expect(res.status).toBe(401)
  })

  it('returns buyer conversations when role=buyer', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(getConversationsForBuyer).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/conversations?role=buyer')
    const res = await getConversations(req)
    expect(res.status).toBe(200)
    expect(getConversationsForBuyer).toHaveBeenCalledWith('u1')
  })

  it('returns seller conversations when role=seller', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(getCurrentShop).mockResolvedValue({ id: 'shop-1' } as any)
    vi.mocked(getConversationsForSeller).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/conversations?role=seller')
    const res = await getConversations(req)
    expect(res.status).toBe(200)
    expect(getConversationsForSeller).toHaveBeenCalledWith('shop-1')
  })
})

describe('GET /api/conversations/[id]/messages', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/conversations/conv-1/messages')
    const res = await getMessagesRoute(req, { params: Promise.resolve({ id: 'conv-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user does not belong to conversation', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u2' } as any)
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      id: 'conv-1',
      buyerId: 'u1',
      shop: { ownerId: 'seller-1' },
    } as any)
    const req = new NextRequest('http://localhost/api/conversations/conv-1/messages')
    const res = await getMessagesRoute(req, { params: Promise.resolve({ id: 'conv-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns messages for authorized user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
      id: 'conv-1',
      buyerId: 'u1',
      shop: { ownerId: 'seller-1' },
    } as any)
    vi.mocked(getMessages).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/conversations/conv-1/messages')
    const res = await getMessagesRoute(req, { params: Promise.resolve({ id: 'conv-1' }) })
    expect(res.status).toBe(200)
    expect(getMessages).toHaveBeenCalledWith('conv-1', 1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test tests/api/conversations.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/conversations/route'`

- [ ] **Step 3: Create `app/api/conversations/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/data/user'
import { getCurrentShop } from '@/lib/seller/queries'
import { getConversationsForBuyer, getConversationsForSeller } from '@/lib/data/chat'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  if (role === 'seller') {
    const shop = await getCurrentShop()
    if (!shop) return NextResponse.json({ error: 'No shop' }, { status: 400 })
    const conversations = await getConversationsForSeller(shop.id)
    return NextResponse.json(conversations)
  }

  const conversations = await getConversationsForBuyer(user.id)
  return NextResponse.json(conversations)
}
```

- [ ] **Step 4: Create `app/api/conversations/[id]/messages/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/data/user'
import { getMessages } from '@/lib/data/chat'
import { prisma } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { shop: { select: { ownerId: true } } },
  })

  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isBuyer = conversation.buyerId === user.id
  const isSeller = conversation.shop.ownerId === user.id
  if (!isBuyer && !isSeller)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)

  const messages = await getMessages(id, page)
  return NextResponse.json(messages)
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test tests/api/conversations.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/conversations/route.ts "app/api/conversations/[id]/messages/route.ts" tests/api/conversations.test.ts
git commit -m "feat(chat): add API routes for conversations and messages"
```

---

### Task 5: findOrCreateConversation server action

**Files:**
- Create: `lib/chat/actions.ts`
- Create: `tests/lib/chat/actions.test.ts`

**Interfaces:**
- Consumes: `getCurrentUser()`, `findOrCreateConversation()` from `@/lib/data/chat`, `prisma` for shop lookup
- Produces: `startConversation(shopId: string): Promise<void>` — redirects to `/chat?c=[id]` on success

- [ ] **Step 1: Write failing test**

```ts
// tests/lib/chat/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedirect = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) })

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('@/lib/data/user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/data/chat', () => ({ findOrCreateConversation: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: { shop: { findUnique: vi.fn() } },
}))

import { getCurrentUser } from '@/lib/data/user'
import { findOrCreateConversation } from '@/lib/data/chat'
import { prisma } from '@/lib/db'
import { startConversation } from '@/lib/chat/actions'

beforeEach(() => vi.clearAllMocks())

describe('startConversation', () => {
  it('redirects to sign-in when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    await expect(startConversation('shop-1')).rejects.toThrow('REDIRECT:/sign-in')
  })

  it('returns error when shop not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.shop.findUnique).mockResolvedValue(null)
    const result = await startConversation('bad-shop')
    expect(result).toEqual({ error: 'Shop not found' })
  })

  it('redirects to /chat?c= with conversation id on success', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(prisma.shop.findUnique).mockResolvedValue({ id: 'shop-1' } as any)
    vi.mocked(findOrCreateConversation).mockResolvedValue({ id: 'conv-1' })
    await expect(startConversation('shop-1')).rejects.toThrow('REDIRECT:/chat?c=conv-1')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test tests/lib/chat/actions.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/chat/actions'`

- [ ] **Step 3: Create `lib/chat/actions.ts`**

```ts
"use server"

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/data/user'
import { findOrCreateConversation } from '@/lib/data/chat'
import { prisma } from '@/lib/db'

export async function startConversation(shopId: string): Promise<{ error?: string } | void> {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } })
  if (!shop) return { error: 'Shop not found' }

  const conversation = await findOrCreateConversation(user.id, shopId)
  redirect(`/chat?c=${conversation.id}`)
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test tests/lib/chat/actions.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/chat/actions.ts tests/lib/chat/actions.test.ts
git commit -m "feat(chat): add startConversation server action"
```

---

### Task 6: Client socket singleton + useSocket hook

**Files:**
- Create: `lib/socket/client.ts`
- Create: `hooks/use-socket.ts`

**Interfaces:**
- Produces:
  - `getSocket(token: string): Socket` — returns/reuses socket instance
  - `disconnectSocket(): void`
  - `useSocket(): { socket: Socket | null; connected: boolean }` — React hook

- [ ] **Step 1: Create `lib/socket/client.ts`**

```ts
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket
  if (socket) socket.disconnect()

  socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
    auth: { token },
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
```

- [ ] **Step 2: Create `hooks/use-socket.ts`**

```ts
"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSocket } from '@/lib/socket/client'
import type { Socket } from 'socket.io-client'

export function useSocket() {
  const { getToken, isSignedIn } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return

    let mounted = true

    async function connect() {
      const token = await getToken()
      if (!token || !mounted) return

      const s = getSocket(token)
      s.on('connect', () => { if (mounted) setConnected(true) })
      s.on('disconnect', () => { if (mounted) setConnected(false) })
      if (mounted) setSocket(s)
    }

    connect()

    return () => { mounted = false }
  }, [isSignedIn, getToken])

  return { socket, connected }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add lib/socket/client.ts hooks/use-socket.ts
git commit -m "feat(chat): add client socket singleton and useSocket hook"
```

---

### Task 7: ConversationList component

**Files:**
- Create: `components/chat/ConversationList.tsx`
- Create: `tests/components/chat/ConversationList.test.tsx`

**Interfaces:**
- Consumes: `ConversationItem` from `@/types/chat`; `useSocket` from `@/hooks/use-socket`
- Props: `{ conversations: ConversationItem[]; activeId?: string; currentUserId: string }`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/chat/ConversationList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ConversationItem } from '@/types/chat'

vi.mock('@/hooks/use-socket', () => ({ useSocket: () => ({ socket: null, connected: false }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import { ConversationList } from '@/components/chat/ConversationList'

const item: ConversationItem = {
  id: 'conv-1',
  lastMessageAt: '2026-06-30T10:00:00Z',
  displayName: 'Cool Shop',
  displayAvatar: null,
  lastMessage: {
    id: 'm1',
    senderId: 'u1',
    receiverId: 'u2',
    content: 'Hello there',
    isRead: false,
    createdAt: '2026-06-30T10:00:00Z',
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
    expect(document.querySelector('[data-unread]')).toBeDefined()
  })

  it('renders empty state when no conversations', () => {
    render(<ConversationList conversations={[]} currentUserId="u2" />)
    expect(screen.getByText(/no conversations/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Install testing library**

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

Then update `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
})
```

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npm test tests/components/chat/ConversationList.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/chat/ConversationList'`

- [ ] **Step 4: Create `components/chat/ConversationList.tsx`**

```tsx
"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useSocket } from '@/hooks/use-socket'
import type { ConversationItem, ChatMessage } from '@/types/chat'

function formatTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return d.toLocaleDateString()
}

interface Props {
  conversations: ConversationItem[]
  activeId?: string
  currentUserId: string
}

export function ConversationList({ conversations: initial, activeId, currentUserId }: Props) {
  const router = useRouter()
  const { socket } = useSocket()
  const [conversations, setConversations] = useState(initial)

  useEffect(() => {
    if (!socket) return

    function handleNewMessage(msg: ChatMessage & { conversationId: string }) {
      setConversations(prev =>
        prev
          .map(c => {
            if (c.id !== msg.conversationId) return c
            return {
              ...c,
              lastMessageAt: msg.createdAt,
              lastMessage: msg,
              hasUnread: msg.receiverId === currentUserId && !msg.isRead,
            }
          })
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      )
    }

    function handleMessageRead({ conversationId }: { conversationId: string }) {
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, hasUnread: false } : c
        )
      )
    }

    socket.on('new-message', handleNewMessage)
    socket.on('message-read', handleMessageRead)
    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('message-read', handleMessageRead)
    }
  }, [socket, currentUserId])

  if (conversations.length === 0) {
    return (
      <div className="w-72 border-r border-border flex items-center justify-center text-sm text-text-secondary">
        No conversations yet
      </div>
    )
  }

  return (
    <div className="w-72 border-r border-border flex flex-col overflow-y-auto">
      {conversations.map(c => (
        <button
          key={c.id}
          onClick={() => router.push(`?c=${c.id}`)}
          className={`flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-50 transition-colors border-b border-border ${
            c.id === activeId ? 'bg-brand-50' : ''
          }`}
        >
          <div className="relative w-10 h-10 rounded-full bg-brand-100 flex-shrink-0 overflow-hidden">
            {c.displayAvatar ? (
              <Image src={c.displayAvatar} alt={c.displayName} fill sizes="40px" className="object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-brand-600 font-bold text-sm">
                {c.displayName[0]}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary truncate">{c.displayName}</span>
              <span className="text-[10px] text-text-secondary flex-shrink-0 ml-1">
                {formatTime(c.lastMessageAt)}
              </span>
            </div>
            <p className="text-xs text-text-secondary truncate mt-0.5">
              {c.lastMessage?.content ?? 'No messages yet'}
            </p>
          </div>
          {c.hasUnread && (
            <span
              data-unread="true"
              className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0"
            />
          )}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test tests/components/chat/ConversationList.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add components/chat/ConversationList.tsx tests/components/chat/ConversationList.test.tsx tests/setup.ts vitest.config.ts
git commit -m "feat(chat): add ConversationList component"
```

---

### Task 8: MessageBubble + ChatInput components

**Files:**
- Create: `components/chat/MessageBubble.tsx`
- Create: `components/chat/ChatInput.tsx`
- Create: `tests/components/chat/MessageBubble.test.tsx`

**Interfaces:**
- `MessageBubble` props: `{ message: ChatMessage; isOwn: boolean }`
- `ChatInput` props: `{ onSend: (content: string) => void; disabled?: boolean }`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/chat/MessageBubble.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ChatMessage } from '@/types/chat'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'

const msg: ChatMessage = {
  id: 'm1',
  senderId: 'u1',
  receiverId: 'u2',
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test tests/components/chat/MessageBubble.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/chat/MessageBubble'`

- [ ] **Step 3: Create `components/chat/MessageBubble.tsx`**

```tsx
import type { ChatMessage } from '@/types/chat'

interface Props {
  message: ChatMessage
  isOwn: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
          isOwn
            ? 'bg-brand-600 text-white rounded-br-none'
            : 'bg-white border border-border text-text-primary rounded-bl-none'
        }`}
      >
        <p>{message.content}</p>
        <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-white/70 text-right' : 'text-text-secondary'}`}>
          {formatTime(message.createdAt)}
          {isOwn && <span className="ml-1">{message.isRead ? '✓✓' : '✓'}</span>}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `components/chat/ChatInput.tsx`**

```tsx
"use client"

import { useState, useRef } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSend: (content: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const text = value.trim()
    if (!text) return
    onSend(text)
    setValue('')
    ref.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-white">
      <textarea
        ref={ref}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand-600 max-h-28 overflow-y-auto disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Send size={16} />
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test tests/components/chat/MessageBubble.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add components/chat/MessageBubble.tsx components/chat/ChatInput.tsx tests/components/chat/MessageBubble.test.tsx
git commit -m "feat(chat): add MessageBubble and ChatInput components"
```

---

### Task 9: ChatWindow component

**Files:**
- Create: `components/chat/ChatWindow.tsx`

**Interfaces:**
- Consumes: `MessageBubble`, `ChatInput`, `useSocket`
- Props: `{ conversationId: string; currentUserId: string; displayName: string }`

- [ ] **Step 1: Create `components/chat/ChatWindow.tsx`**

```tsx
"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSocket } from '@/hooks/use-socket'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import type { ChatMessage } from '@/types/chat'

interface Props {
  conversationId: string
  currentUserId: string
  displayName: string
}

export function ChatWindow({ conversationId, currentUserId, displayName }: Props) {
  const { socket, connected } = useSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load initial messages from API
  useEffect(() => {
    setLoading(true)
    fetch(`/api/conversations/${conversationId}/messages`)
      .then(r => r.json())
      .then((data: ChatMessage[]) => {
        setMessages(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [conversationId])

  // Join socket room and subscribe to events
  useEffect(() => {
    if (!socket) return

    socket.emit('join-room', { conversationId })
    socket.emit('mark-read', { conversationId })

    function handleNewMessage(msg: ChatMessage) {
      setMessages(prev => [...prev, msg])
      if (msg.receiverId === currentUserId) {
        socket.emit('mark-read', { conversationId })
      }
    }

    function handleMessageRead({ conversationId: id }: { conversationId: string }) {
      if (id !== conversationId) return
      setMessages(prev =>
        prev.map(m => (m.senderId === currentUserId ? { ...m, isRead: true } : m))
      )
    }

    socket.on('new-message', handleNewMessage)
    socket.on('message-read', handleMessageRead)
    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('message-read', handleMessageRead)
    }
  }, [socket, conversationId, currentUserId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(
    (content: string) => {
      if (!socket) return
      socket.emit('send-message', { conversationId, content })
    },
    [socket, conversationId]
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-white">
        <p className="font-semibold text-sm text-text-primary">{displayName}</p>
        {!connected && (
          <p className="text-xs text-text-secondary">Reconnecting…</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg-page">
        {loading && (
          <p className="text-center text-sm text-text-secondary">Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-text-secondary">
            Say hi to start the conversation!
          </p>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={!connected} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/chat/ChatWindow.tsx
git commit -m "feat(chat): add ChatWindow component"
```

---

### Task 10: Buyer /chat page

**Files:**
- Create: `app/(shop)/chat/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUser()`, `getConversationsForBuyer()`, `ConversationList`, `ChatWindow`
- URL: `/chat` and `/chat?c=[conversationId]`

- [ ] **Step 1: Create `app/(shop)/chat/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/data/user'
import { getConversationsForBuyer } from '@/lib/data/chat'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import type { ConversationItem } from '@/types/chat'

export const metadata: Metadata = { title: 'Messages' }

interface Props {
  searchParams: Promise<{ c?: string }>
}

export default async function ChatPage({ searchParams }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { c: conversationId } = await searchParams
  const raw = await getConversationsForBuyer(user.id)

  const conversations: ConversationItem[] = raw.map(c => ({
    id: c.id,
    lastMessageAt: c.lastMessageAt.toISOString(),
    displayName: c.shop.name,
    displayAvatar: c.shop.logo,
    lastMessage: c.messages[0]
      ? {
          id: c.messages[0].id,
          senderId: c.messages[0].senderId,
          receiverId: c.messages[0].receiverId,
          content: c.messages[0].content,
          isRead: c.messages[0].isRead,
          createdAt: c.messages[0].createdAt.toISOString(),
        }
      : null,
    hasUnread:
      !!c.messages[0] &&
      !c.messages[0].isRead &&
      c.messages[0].receiverId === user.id,
  }))

  const active = conversationId
    ? conversations.find(c => c.id === conversationId)
    : undefined

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-text-primary mb-4">Messages</h1>
      <div className="flex border border-border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        <ConversationList
          conversations={conversations}
          activeId={conversationId}
          currentUserId={user.id}
        />
        {active ? (
          <ChatWindow
            conversationId={active.id}
            currentUserId={user.id}
            displayName={active.displayName}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual smoke test**

Start `npm run dev`, sign in as a buyer, navigate to `http://localhost:3000/chat`. Expected: Messages page with conversation list sidebar (or "No conversations yet" if none exist).

- [ ] **Step 3: Commit**

```bash
git add app/"(shop)"/chat/page.tsx
git commit -m "feat(chat): add buyer chat inbox page"
```

---

### Task 11: Seller chat page + SellerSidebar update

**Files:**
- Create: `app/(seller)/seller/(portal)/chat/page.tsx`
- Modify: `components/seller/SellerSidebar.tsx`

**Interfaces:**
- Consumes: `getCurrentUser()`, `getCurrentShop()`, `getConversationsForSeller()`, `ConversationList`, `ChatWindow`
- URL: `/seller/chat` and `/seller/chat?c=[conversationId]`

- [ ] **Step 1: Create `app/(seller)/seller/(portal)/chat/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/data/user'
import { getCurrentShop } from '@/lib/seller/queries'
import { getConversationsForSeller } from '@/lib/data/chat'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import type { ConversationItem } from '@/types/chat'

export const metadata: Metadata = { title: 'Messages | Seller Centre' }

interface Props {
  searchParams: Promise<{ c?: string }>
}

export default async function SellerChatPage({ searchParams }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const shop = await getCurrentShop()
  if (!shop) redirect('/seller/onboarding')

  const { c: conversationId } = await searchParams
  const raw = await getConversationsForSeller(shop.id)

  const conversations: ConversationItem[] = raw.map(c => ({
    id: c.id,
    lastMessageAt: c.lastMessageAt.toISOString(),
    displayName: c.buyer.name,
    displayAvatar: c.buyer.avatar,
    lastMessage: c.messages[0]
      ? {
          id: c.messages[0].id,
          senderId: c.messages[0].senderId,
          receiverId: c.messages[0].receiverId,
          content: c.messages[0].content,
          isRead: c.messages[0].isRead,
          createdAt: c.messages[0].createdAt.toISOString(),
        }
      : null,
    hasUnread:
      !!c.messages[0] &&
      !c.messages[0].isRead &&
      c.messages[0].receiverId === user.id,
  }))

  const active = conversationId
    ? conversations.find(c => c.id === conversationId)
    : undefined

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
      <div className="flex border border-border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
        <ConversationList
          conversations={conversations}
          activeId={conversationId}
          currentUserId={user.id}
        />
        {active ? (
          <ChatWindow
            conversationId={active.id}
            currentUserId={user.id}
            displayName={active.displayName}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Chat to SellerSidebar NAV array**

In `components/seller/SellerSidebar.tsx`, add `{ label: "Messages", href: "/seller/chat" }` to the `NAV` array, after `"Reviews"`:

```ts
const NAV = [
  { label: "Dashboard", href: "/seller/dashboard" },
  { label: "All Products", href: "/seller/products" },
  { label: "Add Product", href: "/seller/products/new" },
  { label: "Orders", href: "/seller/orders" },
  { label: "Reviews", href: "/seller/reviews" },
  { label: "Messages", href: "/seller/chat" },
  { label: "Shop Settings", href: "/seller/settings" },
]
```

- [ ] **Step 3: Manual smoke test**

Sign in as a seller, navigate to `http://localhost:3000/seller/chat`. Expected: "Messages" in sidebar is highlighted, chat inbox renders.

- [ ] **Step 4: Commit**

```bash
git add app/"(seller)"/seller/"(portal)"/chat/page.tsx components/seller/SellerSidebar.tsx
git commit -m "feat(chat): add seller chat inbox page and sidebar link"
```

---

### Task 12: UnreadBadge in Navbar + "Chat with Seller" on product page

**Files:**
- Create: `components/chat/UnreadBadge.tsx`
- Modify: `components/layout/Navbar.tsx`
- Modify: `components/product/ShopPanel.tsx`

**Interfaces:**
- `UnreadBadge` — no props, self-contained; reads `unread-count` from socket

- [ ] **Step 1: Create `components/chat/UnreadBadge.tsx`**

```tsx
"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useSocket } from '@/hooks/use-socket'

export function UnreadBadge() {
  const { socket } = useSocket()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!socket) return

    function handleUnreadCount({ count }: { count: number }) {
      setCount(count)
    }

    socket.on('unread-count', handleUnreadCount)
    return () => { socket.off('unread-count', handleUnreadCount) }
  }, [socket])

  return (
    <Link
      href="/chat"
      aria-label="Messages"
      className="relative hover:text-brand-100 hover:scale-110 transition-all duration-200"
    >
      <MessageCircle size={22} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-accent-sale text-white text-[10px] font-bold min-w-4 h-4 rounded-full flex items-center justify-center px-0.5">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Add UnreadBadge to Navbar**

In `components/layout/Navbar.tsx`, add the import at the top:

```ts
import { UnreadBadge } from "@/components/chat/UnreadBadge"
```

Then add `<UnreadBadge />` in the "Right actions" div, between the Bell button and the divider:

```tsx
{/* Right actions */}
<div className="flex items-center gap-5 flex-shrink-0">
  <Link href="/cart" ...>
    ...
  </Link>
  <UnreadBadge />           {/* ← add this */}
  <button aria-label="Notifications" ...>
    <Bell size={22} />
  </button>
  <div className="h-5 w-px bg-white/30" />
  ...
</div>
```

- [ ] **Step 3: Add "Chat with Seller" button to ShopPanel**

`components/product/ShopPanel.tsx` is a server component. Add a `startConversation` form button. First add the shop `id` to the props interface, then add the button:

Full updated file:

```tsx
import Image from "next/image"
import Link from "next/link"
import { startConversation } from "@/lib/chat/actions"

interface ShopPanelProps {
  shop: {
    id: string
    name: string
    slug: string
    logo: string | null
    rating: number
    followersCount: number
  }
}

export function ShopPanel({ shop }: ShopPanelProps) {
  return (
    <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-brand-100 flex-shrink-0">
        {shop.logo ? (
          <Image src={shop.logo} alt={shop.name} fill sizes="48px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-600 font-bold text-lg">
            {shop.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-text-primary truncate">{shop.name}</p>
        <p className="text-xs text-text-secondary">
          ★ {shop.rating.toFixed(1)} · {shop.followersCount.toLocaleString()} followers
        </p>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <Link
          href={`/shop/${shop.slug}`}
          className="px-3 py-1.5 border border-brand-600 text-brand-600 rounded text-xs font-medium hover:bg-brand-50 transition-colors text-center"
        >
          Visit Shop
        </Link>
        <form action={startConversation.bind(null, shop.id)}>
          <button
            type="submit"
            className="w-full px-3 py-1.5 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-500 transition-colors"
          >
            Chat with Seller
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify `shop.id` is included in the product query**

Check `lib/data/catalog.ts` — the `getProductBySlug` function's shop select must include `id`. Open the file and confirm `id` is in the shop select object. If it's missing, add it.

Run:

```bash
npx tsc --noEmit
```

Expected: No type errors (TypeScript will catch if `id` is missing from the shop select).

- [ ] **Step 5: End-to-end smoke test**

1. Sign in as a buyer, navigate to any product page
2. Click "Chat with Seller" — expected: redirected to `/chat?c=[id]` with the ChatWindow open
3. Send a message — expected: message appears in the thread instantly
4. Open a new tab, sign in as the seller, go to `/seller/chat` — expected: the conversation appears with the buyer's message and an unread dot

- [ ] **Step 6: Commit**

```bash
git add components/chat/UnreadBadge.tsx components/layout/Navbar.tsx components/product/ShopPanel.tsx
git commit -m "feat(chat): add UnreadBadge to Navbar and Chat with Seller button on product page"
```

---

## Done

All tasks complete. The feature is fully implemented when:
- `npm run dev` starts the custom Socket.IO server successfully
- Buyer can open `/chat`, see their conversations, and exchange messages in real-time
- Seller can open `/seller/chat` and reply to buyers
- "Chat with Seller" on a product page creates/opens the conversation
- Unread message count shows in the Navbar and updates in real-time without page refresh
- `npm test` passes all tests
