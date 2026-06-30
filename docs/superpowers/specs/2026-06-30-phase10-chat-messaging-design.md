# Phase 10: Chat / Messaging — Design Spec

**Date:** 2026-06-30
**Status:** Approved

---

## Overview

Buyer–seller real-time chat using Socket.IO on a custom Node.js server deployed on Railway. Each buyer-shop pair has one conversation (enforced by the existing Prisma schema). Both buyers and sellers have a dedicated `/chat` inbox page. A "Chat with Seller" button on the product detail page creates or opens the conversation.

---

## 1. Architecture

A `server.js` at the project root replaces `next start`. It creates a single HTTP server, attaches Next.js as the request handler, and mounts Socket.IO on top — one process, one port.

```
server.js
  └── HTTP Server
        ├── Next.js (all page/API routes)
        └── Socket.IO
              ├── Event: join-room      (client joins their conversation room)
              ├── Event: send-message   (client sends a message)
              ├── Event: mark-read      (client marks messages as read)
              ├── Event: new-message    (server broadcasts to recipient)
              └── Event: unread-count   (server pushes updated badge count)
```

**Auth:** Clerk session token passed as a Socket.IO handshake query param, verified server-side before any events are processed. Unauthenticated sockets are immediately disconnected.

**Persistence:** Every `send-message` event is written to the DB via Prisma on the server before broadcasting. Messages are never lost if the recipient is offline.

**Deployment:** Railway persistent Node.js process. Start command: `node server.js`.

---

## 2. Database

No schema changes needed. The existing Prisma models cover all requirements:

```prisma
model Conversation {
  id            String   @id @default(cuid())
  buyerId       String
  shopId        String
  lastMessageAt DateTime @default(now())

  buyer    User      @relation("BuyerConversations", ...)
  shop     Shop      @relation(...)
  messages Message[]

  @@unique([buyerId, shopId])  // one conversation per buyer-shop pair
}

model Message {
  id             String   @id @default(cuid())
  senderId       String
  receiverId     String
  conversationId String
  content        String
  isRead         Boolean  @default(false)
  createdAt      DateTime @default(now())

  sender       User         @relation("SentMessages", ...)
  receiver     User         @relation("ReceivedMessages", ...)
  conversation Conversation @relation(...)
}
```

---

## 3. Pages & Routes

| Route | Who sees it | Description |
|---|---|---|
| `/chat` | Buyer | Full inbox: conversation list + active chat panel |
| `/chat?c=[conversationId]` | Buyer | Opens specific conversation directly |
| `/(seller)/seller/chat` | Seller | Same layout, scoped to seller's shop conversations |
| `/(seller)/seller/chat?c=[conversationId]` | Seller | Opens specific conversation directly |

**"Chat with Seller" button:** On the product detail page. Calls a server action that upserts the `Conversation` record (`findOrCreate` by `buyerId + shopId`), then redirects to `/chat?c=[conversationId]`.

**API Routes (initial data load only — not real-time):**
- `GET /api/conversations` — list conversations for the current user (buyer or seller)
- `GET /api/conversations/[id]/messages` — paginated message history (newest-first, 30 per page)

---

## 4. Socket.IO Event Protocol

Each conversation has a room named by its `conversationId`. Users join the room on page load.

### Client → Server

| Event | Payload | Server action |
|---|---|---|
| `join-room` | `{ conversationId }` | Verify user belongs to conversation, join socket room |
| `send-message` | `{ conversationId, content }` | Persist to DB, update `lastMessageAt`, broadcast `new-message` to room |
| `mark-read` | `{ conversationId }` | Mark all unread messages in conversation as read, push `message-read` and updated `unread-count` |

### Server → Client

| Event | Payload | When |
|---|---|---|
| `new-message` | Full message object `{ id, senderId, content, createdAt }` | When a message is sent to the room |
| `message-read` | `{ conversationId }` | When recipient marks messages read (sender sees read receipt) |
| `unread-count` | `{ count }` | On connect + after any send/read event |

**Offline users:** Message saved to DB. On next connect, `unread-count` is recalculated from DB and pushed immediately.

---

## 5. Components

### Layout (both `/chat` and `/seller/chat`)

```
┌─────────────────────────────────────────────────────┐
│  ConversationList (sidebar)  │  ChatWindow           │
│  ┌────────────────────────┐  │  ┌─────────────────┐  │
│  │ [Avatar] Shop Name  🔴3│  │  │ Shop Name       │  │
│  │ Last message preview   │  │  │─────────────────│  │
│  ├────────────────────────┤  │  │ [MessageBubble] │  │
│  │ [Avatar] Shop Name 2   │  │  │  [MessageBubble]│  │
│  │ Last message preview   │  │  │─────────────────│  │
│  └────────────────────────┘  │  │ [ChatInput]     │  │
│                              │  └─────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Component List

**`ConversationList`** — Scrollable sidebar. Each row: shop/buyer avatar, name, last message preview (truncated), timestamp, unread count badge. Active conversation is highlighted. Sorted by `lastMessageAt` descending.

**`ChatWindow`** — Renders the active conversation's message thread. Auto-scrolls to bottom on new message. Shows empty state when no conversation is selected.

**`MessageBubble`** — Right-aligned for own messages (blue background), left-aligned for theirs (grey). Shows timestamp on hover. Read receipt indicator (single tick = sent, double tick = read) on own messages.

**`ChatInput`** — Textarea with Send button. Enter submits, Shift+Enter inserts newline. Emits `send-message` socket event. Clears on send.

**`UnreadBadge`** — Red count bubble on chat icon in Navbar. Driven by `unread-count` socket event. Shows for both buyers and sellers.

**`useSocket` hook** — Manages socket connection lifecycle (connect on mount, disconnect on unmount), connection state, and event listener registration. Shared between buyer and seller chat pages. Accepts Clerk session token for auth handshake.

---

## 6. Error Handling

- **Socket disconnect:** Show a "Reconnecting…" banner; Socket.IO auto-reconnects with exponential backoff.
- **Send failure:** If `send-message` emits but no `new-message` is received within 5s, show an error toast and allow retry.
- **Empty message:** Prevent sending blank or whitespace-only messages (client-side guard).
- **Unauthorized room join:** Server rejects `join-room` if the user is not the buyer or the shop owner; socket receives an `error` event and is redirected.

---

## 7. Testing Approach

- Unit test the `useSocket` hook with a mock socket
- Unit test `ConversationList` and `MessageBubble` with static data
- Integration test: create conversation via "Chat with Seller", send a message, verify it appears in both buyer and seller inboxes
- Integration test: mark-read flow — send message, verify unread count increments, open conversation, verify count resets
