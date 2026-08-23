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
  const [otherUserTyping, setOtherUserTyping] = useState(false)
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

    function handleUserTyping({ conversationId: id, userId }: { conversationId: string; userId: string }) {
      if (id !== conversationId || userId === currentUserId) return
      setOtherUserTyping(true)
    }

    function handleUserStoppedTyping({ conversationId: id, userId }: { conversationId: string; userId: string }) {
      if (id !== conversationId || userId === currentUserId) return
      setOtherUserTyping(false)
    }

    s.on('new-message', handleNewMessage)
    s.on('message-read', handleMessageRead)
    s.on('user-typing', handleUserTyping)
    s.on('user-stopped-typing', handleUserStoppedTyping)
    return () => {
      s.off('new-message', handleNewMessage)
      s.off('message-read', handleMessageRead)
      s.off('user-typing', handleUserTyping)
      s.off('user-stopped-typing', handleUserStoppedTyping)
    }
  }, [socket, conversationId, currentUserId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setOtherUserTyping(false)
  }, [conversationId])

  const handleSend = useCallback(
    (content: string, imageUrl?: string | null) => {
      if (!socket) return
      socket.emit('send-message', { conversationId, content, imageUrl })
    },
    [socket, conversationId]
  )

  const handleTypingStart = useCallback(() => {
    socket?.emit('typing-start', { conversationId })
  }, [socket, conversationId])

  const handleTypingStop = useCallback(() => {
    socket?.emit('typing-stop', { conversationId })
  }, [socket, conversationId])

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

      {otherUserTyping && (
        <p className="px-4 py-1 text-xs text-text-secondary italic">{displayName} is typing…</p>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={!connected}
      />
    </div>
  )
}
