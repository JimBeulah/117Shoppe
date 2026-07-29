"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

// Relative-time text depends on Date.now(), which differs between the SSR
// pass and hydration — render nothing until mounted so the two always agree.
function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState('')

  useEffect(() => {
    setText(formatTime(iso))
  }, [iso])

  return (
    <span className="text-[10px] text-text-secondary flex-shrink-0 ml-1">
      {text}
    </span>
  )
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
              <RelativeTime iso={c.lastMessageAt} />
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
