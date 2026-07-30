"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { NotificationItem } from "@/types/notifications"

function formatTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return "Now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

// Relative-time text depends on Date.now(), which differs between the SSR
// pass and hydration — render nothing until mounted so the two always agree.
function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState("")

  useEffect(() => {
    setText(formatTime(iso))
  }, [iso])

  return <p className="text-[10px] text-text-secondary mt-1">{text}</p>
}

interface Props {
  notification: NotificationItem
  onRead: (id: string) => void
}

export function NotificationRow({ notification, onRead }: Props) {
  return (
    <Link
      href={notification.link ?? "/notifications"}
      onClick={() => onRead(notification.id)}
      className="flex items-start gap-2 px-4 py-3 hover:bg-brand-50 transition-colors border-b border-border last:border-b-0"
    >
      {!notification.isRead && (
        <span data-unread="true" className="mt-1.5 w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />
      )}
      <div className={notification.isRead ? "flex-1 min-w-0 ml-4" : "flex-1 min-w-0"}>
        <p className="text-sm font-medium text-text-primary">{notification.title}</p>
        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notification.message}</p>
        <RelativeTime iso={notification.createdAt} />
      </div>
    </Link>
  )
}
