import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getNotificationPreferences, NOTIFICATION_TYPE_LABELS } from "@/lib/notifications/preferences"
import { NotificationPreferenceToggle } from "@/components/notifications/NotificationPreferenceToggle"

export const metadata = { title: "Notification settings | 11/7 Shoppe" }

export default async function NotificationSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const preferences = await getNotificationPreferences(user.id)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-primary">Notification settings</h1>
        <Link href="/notifications" className="text-sm text-brand-600 hover:underline">
          Back to notifications
        </Link>
      </div>

      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, label]) => (
          <NotificationPreferenceToggle key={type} type={type} label={label} initialEnabled={preferences[type]} />
        ))}
      </div>
    </div>
  )
}
