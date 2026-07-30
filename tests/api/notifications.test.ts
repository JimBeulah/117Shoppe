import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/data/user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/data/notifications', () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
}))

import { getCurrentUser } from '@/lib/data/user'
import { getNotifications, getUnreadNotificationCount } from '@/lib/data/notifications'
import { GET } from '@/app/api/notifications/route'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/notifications')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns notifications and unread count for the current user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
    vi.mocked(getNotifications).mockResolvedValue({ notifications: [], total: 0, pageSize: 20 } as any)
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(2)
    const req = new NextRequest('http://localhost/api/notifications?page=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(getNotifications).toHaveBeenCalledWith('u1', 1)
    const body = await res.json()
    expect(body.unreadCount).toBe(2)
  })
})
