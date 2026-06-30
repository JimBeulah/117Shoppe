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
