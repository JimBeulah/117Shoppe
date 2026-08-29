"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Compass, MessageCircle, User } from "lucide-react"
import { useSocket } from "@/hooks/use-socket"

const TABS = [
  { key: "home", href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { key: "discover", href: "/discover", label: "Discover", icon: Compass, match: (p: string) => p.startsWith("/discover") },
  { key: "chat", href: "/chat", label: "Chat", icon: MessageCircle, match: (p: string) => p.startsWith("/chat") },
  { key: "account", href: "/account/profile", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") },
] as const

export function MobileTabBar() {
  const pathname = usePathname()
  const { socket } = useSocket()
  const [chatUnread, setChatUnread] = useState(0)

  useEffect(() => {
    if (!socket) return

    function handleUnreadCount({ count }: { count: number }) {
      setChatUnread(count)
    }

    socket.on("unread-count", handleUnreadCount)
    return () => { socket.off("unread-count", handleUnreadCount) }
  }, [socket])

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border flex items-stretch h-14"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ key, href, label, icon: Icon, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={key}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
              active ? "text-brand-600" : "text-text-secondary"
            }`}
          >
            <span className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {key === "chat" && chatUnread > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-accent-sale text-white text-[9px] font-bold min-w-3.5 h-3.5 rounded-full flex items-center justify-center px-0.5">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
