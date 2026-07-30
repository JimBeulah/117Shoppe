"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { useSocket } from "@/hooks/use-socket"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover"
import { NotificationRow } from "@/components/notifications/NotificationRow"
import { markAsRead, markAllAsRead } from "@/lib/notifications/actions"
import type { NotificationItem } from "@/types/notifications"

export function NotificationBell() {
  const { socket } = useSocket()
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!socket) return

    function handleCount({ count }: { count: number }) {
      setCount(count)
    }
    function handleNew(notification: NotificationItem) {
      setItems((prev) => [notification, ...prev].slice(0, 10))
    }

    socket.on("unread-notification-count", handleCount)
    socket.on("notification", handleNew)
    return () => {
      socket.off("unread-notification-count", handleCount)
      socket.off("notification", handleNew)
    }
  }, [socket])

  const loadRecent = useCallback(() => {
    if (loaded) return
    fetch("/api/notifications?page=1")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.notifications.slice(0, 10))
        setCount(data.unreadCount)
        setLoaded(true)
      })
      .catch(() => {})
  }, [loaded])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) loadRecent()
  }

  function handleReadOne(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setCount((prev) => Math.max(0, prev - 1))
    markAsRead(id)
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setCount(0)
    markAllAsRead()
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative hover:text-brand-100 hover:scale-110 transition-all duration-200"
        >
          <Bell size={22} />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-accent-sale text-white text-[10px] font-bold min-w-4 h-4 rounded-full flex items-center justify-center px-0.5">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-text-primary p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:underline">
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-secondary">No notifications yet</p>
          ) : (
            items.map((n) => <NotificationRow key={n.id} notification={n} onRead={handleReadOne} />)
          )}
        </div>
        <Link
          href="/notifications"
          className="block text-center text-xs text-brand-600 hover:underline px-4 py-2 border-t border-border"
        >
          View all notifications
        </Link>
      </PopoverContent>
    </Popover>
  )
}
