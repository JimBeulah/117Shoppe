import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getNotifications } from "@/lib/data/notifications"
import { markAllAsRead } from "@/lib/notifications/actions"

export const metadata = { title: "Notifications | 11/7 Shoppe" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

async function markAllAsReadAction() {
  "use server"
  await markAllAsRead()
}

export default async function NotificationsPage({ searchParams }: Props) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || "1", 10))
  const { notifications, total, pageSize } = await getNotifications(user.id, page)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-primary">Notifications</h1>
        <div className="flex items-center gap-3">
          <Link href="/notifications/settings" className="text-sm text-brand-600 hover:underline">
            Settings
          </Link>
          <form action={markAllAsReadAction}>
            <button type="submit" className="text-sm text-brand-600 hover:underline">
              Mark all as read
            </button>
          </form>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        {notifications.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-secondary">No notifications yet</p>
        )}
        {notifications.map((n) => (
          <Link
            key={n.id}
            href={n.link ?? "/notifications"}
            className={`flex items-start gap-3 px-4 py-3 hover:bg-brand-50 transition-colors ${
              n.isRead ? "" : "bg-brand-50/40"
            }`}
          >
            {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />}
            <div className={n.isRead ? "flex-1 min-w-0 ml-4" : "flex-1 min-w-0"}>
              <p className="text-sm font-medium text-text-primary">{n.title}</p>
              <p className="text-xs text-text-secondary mt-0.5">{n.message}</p>
              <p className="text-[10px] text-text-secondary mt-1">{n.createdAt.toLocaleString()}</p>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          {page > 1 && (
            <Link href={`/notifications?page=${page - 1}`} className="text-brand-600 hover:underline">
              Previous
            </Link>
          )}
          <span className="text-text-secondary">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/notifications?page=${page + 1}`} className="text-brand-600 hover:underline">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
