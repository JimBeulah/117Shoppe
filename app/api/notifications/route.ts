import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/data/user'
import { getNotifications, getUnreadNotificationCount } from '@/lib/data/notifications'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)

  const [{ notifications, total, pageSize }, unreadCount] = await Promise.all([
    getNotifications(user.id, page),
    getUnreadNotificationCount(user.id),
  ])

  return NextResponse.json({ notifications, total, pageSize, unreadCount })
}
