"use server"

import { getCurrentUser } from "@/lib/data/user"
import { recordSearchHistory } from "@/lib/data/search"

export async function recordSearch(query: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return {}

  const trimmed = query.trim()
  if (!trimmed || trimmed.length > 200) return {}

  await recordSearchHistory(user.id, trimmed)
  return {}
}
