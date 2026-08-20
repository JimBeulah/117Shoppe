import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock("@/lib/socket/io", () => ({
  getIO: vi.fn(),
}))

vi.mock("@/lib/notifications/preferences", () => ({
  isNotificationTypeEnabled: vi.fn().mockResolvedValue(true),
}))

const mockNotification = {
  id: "n1",
  userId: "u1",
  type: "NEW_MESSAGE",
  title: "New message",
  message: "Hi!",
  link: "/chat",
  isRead: false,
  createdAt: new Date("2026-07-30T10:00:00Z"),
}

describe("createNotification", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a Notification row with the given fields", async () => {
    const { prisma } = await import("@/lib/db")
    const { getIO } = await import("@/lib/socket/io")
    vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any)
    vi.mocked(prisma.notification.count).mockResolvedValue(1 as any)
    vi.mocked(getIO).mockReturnValue(null)

    const { createNotification } = await import("@/lib/notifications/create")
    await createNotification({ userId: "u1", type: "NEW_MESSAGE", title: "New message", message: "Hi!", link: "/chat" })

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: "u1", type: "NEW_MESSAGE", title: "New message", message: "Hi!", link: "/chat" },
    })
  })

  it('emits "notification" and "unread-notification-count" to the user room when io is available', async () => {
    const emit = vi.fn()
    const to = vi.fn(() => ({ emit }))
    const { prisma } = await import("@/lib/db")
    const { getIO } = await import("@/lib/socket/io")
    vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any)
    vi.mocked(prisma.notification.count).mockResolvedValue(3 as any)
    vi.mocked(getIO).mockReturnValue({ to } as any)

    const { createNotification } = await import("@/lib/notifications/create")
    await createNotification({ userId: "u1", type: "NEW_MESSAGE", title: "New message", message: "Hi!", link: "/chat" })

    expect(to).toHaveBeenCalledWith("user:u1")
    expect(emit).toHaveBeenCalledWith("notification", expect.objectContaining({ id: "n1", title: "New message" }))
    expect(emit).toHaveBeenCalledWith("unread-notification-count", { count: 3 })
  })

  it("does not throw when io is not yet available", async () => {
    const { prisma } = await import("@/lib/db")
    const { getIO } = await import("@/lib/socket/io")
    vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any)
    vi.mocked(prisma.notification.count).mockResolvedValue(1 as any)
    vi.mocked(getIO).mockReturnValue(null)

    const { createNotification } = await import("@/lib/notifications/create")
    await expect(
      createNotification({ userId: "u1", type: "NEW_MESSAGE", title: "New message", message: "Hi!", link: null })
    ).resolves.toBeDefined()
  })

  it("skips creation when the user has muted the notification type", async () => {
    const { prisma } = await import("@/lib/db")
    const { isNotificationTypeEnabled } = await import("@/lib/notifications/preferences")
    vi.mocked(isNotificationTypeEnabled).mockResolvedValueOnce(false)

    const { createNotification } = await import("@/lib/notifications/create")
    const result = await createNotification({
      userId: "u1",
      type: "NEW_MESSAGE",
      title: "New message",
      message: "Hi!",
      link: "/chat",
    })

    expect(result).toBeNull()
    expect(prisma.notification.create).not.toHaveBeenCalled()
  })
})
