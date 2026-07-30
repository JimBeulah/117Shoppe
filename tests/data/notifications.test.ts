import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const prisma = {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  }
  return { prisma }
})

describe("getNotifications", () => {
  beforeEach(() => vi.clearAllMocks())

  it("fetches page 1 with default page size 20, newest first", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notification.findMany).mockResolvedValue([])
    vi.mocked(prisma.notification.count).mockResolvedValue(0)

    const { getNotifications } = await import("@/lib/data/notifications")
    await getNotifications("u1")

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      })
    )
  })

  it("calculates correct skip for page 2", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notification.findMany).mockResolvedValue([])
    vi.mocked(prisma.notification.count).mockResolvedValue(0)

    const { getNotifications } = await import("@/lib/data/notifications")
    await getNotifications("u1", 2)

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 })
    )
  })
})

describe("getUnreadNotificationCount", () => {
  beforeEach(() => vi.clearAllMocks())

  it("counts unread notifications for the user", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notification.count).mockResolvedValue(5)

    const { getUnreadNotificationCount } = await import("@/lib/data/notifications")
    const result = await getUnreadNotificationCount("u1")

    expect(result).toBe(5)
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: "u1", isRead: false } })
  })
})

describe("markNotificationRead", () => {
  beforeEach(() => vi.clearAllMocks())

  it("scopes the update to the owning user", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 } as any)

    const { markNotificationRead } = await import("@/lib/data/notifications")
    await markNotificationRead("n1", "u1")

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", userId: "u1" },
      data: { isRead: true },
    })
  })
})

describe("markAllNotificationsRead", () => {
  beforeEach(() => vi.clearAllMocks())

  it("marks all unread notifications for the user as read", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 } as any)

    const { markAllNotificationsRead } = await import("@/lib/data/notifications")
    await markAllNotificationsRead("u1")

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", isRead: false },
      data: { isRead: true },
    })
  })
})
