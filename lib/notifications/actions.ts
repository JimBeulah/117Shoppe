"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/data/user"
import { markNotificationRead, markAllNotificationsRead } from "@/lib/data/notifications"

export async function markAsRead(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  await markNotificationRead(id, user.id)
  revalidatePath("/notifications")
  return {}
}

export async function markAllAsRead(): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  await markAllNotificationsRead(user.id)
  revalidatePath("/notifications")
  return {}
}
