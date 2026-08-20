import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    notificationPreference: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

describe("getNotificationPreferences", () => {
  beforeEach(() => vi.clearAllMocks())

  it("defaults every notification type to enabled when no rows exist", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue([] as any)

    const { getNotificationPreferences } = await import("@/lib/notifications/preferences")
    const prefs = await getNotificationPreferences("u1")

    expect(prefs.NEW_MESSAGE).toBe(true)
    expect(prefs.ORDER_STATUS).toBe(true)
  })

  it("applies stored overrides", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue([
      { userId: "u1", type: "NEW_MESSAGE", enabled: false },
    ] as any)

    const { getNotificationPreferences } = await import("@/lib/notifications/preferences")
    const prefs = await getNotificationPreferences("u1")

    expect(prefs.NEW_MESSAGE).toBe(false)
    expect(prefs.ORDER_STATUS).toBe(true)
  })
})

describe("isNotificationTypeEnabled", () => {
  beforeEach(() => vi.clearAllMocks())

  it("defaults to true when no preference row exists", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null)

    const { isNotificationTypeEnabled } = await import("@/lib/notifications/preferences")
    await expect(isNotificationTypeEnabled("u1", "NEW_MESSAGE")).resolves.toBe(true)
  })

  it("returns false when the user muted the type", async () => {
    const { prisma } = await import("@/lib/db")
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({ enabled: false } as any)

    const { isNotificationTypeEnabled } = await import("@/lib/notifications/preferences")
    await expect(isNotificationTypeEnabled("u1", "NEW_MESSAGE")).resolves.toBe(false)
  })
})

describe("setNotificationPreference", () => {
  beforeEach(() => vi.clearAllMocks())

  it("upserts the preference row scoped to the user and type", async () => {
    const { prisma } = await import("@/lib/db")
    const { setNotificationPreference } = await import("@/lib/notifications/preferences")

    await setNotificationPreference("u1", "NEW_MESSAGE", false)

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: { userId_type: { userId: "u1", type: "NEW_MESSAGE" } },
      create: { userId: "u1", type: "NEW_MESSAGE", enabled: false },
      update: { enabled: false },
    })
  })
})
