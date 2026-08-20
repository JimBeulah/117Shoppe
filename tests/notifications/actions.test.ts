import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/data/user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/data/notifications", () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))
vi.mock("@/lib/notifications/preferences", () => ({
  setNotificationPreference: vi.fn(),
}))

describe("markAsRead", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when unauthenticated", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { markAsRead } = await import("@/lib/notifications/actions")
    const result = await markAsRead("n1")

    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("marks the notification read scoped to the current user", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as any)

    const { markNotificationRead } = await import("@/lib/data/notifications")
    const { markAsRead } = await import("@/lib/notifications/actions")
    await markAsRead("n1")

    expect(markNotificationRead).toHaveBeenCalledWith("n1", "u1")
  })
})

describe("markAllAsRead", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when unauthenticated", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { markAllAsRead } = await import("@/lib/notifications/actions")
    const result = await markAllAsRead()

    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("marks all notifications read for the current user", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as any)

    const { markAllNotificationsRead } = await import("@/lib/data/notifications")
    const { markAllAsRead } = await import("@/lib/notifications/actions")
    await markAllAsRead()

    expect(markAllNotificationsRead).toHaveBeenCalledWith("u1")
  })
})

describe("updateNotificationPreference", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when unauthenticated", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const { updateNotificationPreference } = await import("@/lib/notifications/actions")
    const result = await updateNotificationPreference("NEW_MESSAGE", false)

    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("updates the preference for the current user", async () => {
    const { getCurrentUser } = await import("@/lib/data/user")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as any)

    const { setNotificationPreference } = await import("@/lib/notifications/preferences")
    const { updateNotificationPreference } = await import("@/lib/notifications/actions")
    await updateNotificationPreference("NEW_MESSAGE", false)

    expect(setNotificationPreference).toHaveBeenCalledWith("u1", "NEW_MESSAGE", false)
  })
})
