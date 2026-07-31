"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load initial messages from API
  const { data, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      return res.json()
    },
  })

  useEffect(() => {
    if (data) setMessages(data)
  }, [data])

  // Join socket room and subscribe to events
  useEffect(() => {
    if (!socket) return

    const s = socket

    s.emit('join-room', { conversationId })
    s.emit('mark-read', { conversationId })

    function handleNewMessage(msg: ChatMessage) {
      setMessages(prev => [...prev, msg])
      if (msg.receiverId === currentUserId) {
        s.emit('mark-read', { conversationId })
      }
    }

    function handleMessageRead({ conversationId: id }: { conversationId: string }) {
      if (id !== conversationId) return
      setMessages(prev =>
        prev.map(m => (m.senderId === currentUserId ? { ...m, isRead: true } : m))
      )
    }

    s.on('new-message', handleNewMessage)
    s.on('message-read', handleMessageRead)
    return () => {
      s.off('new-message', handleNewMessage)
      s.off('message-read', handleMessageRead)
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
        {isLoading && (
          <p className="text-center text-sm text-text-secondary">Loading…</p>
        )}
        {!isLoading && messages.length === 0 && (
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
