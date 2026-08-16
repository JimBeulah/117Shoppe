import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import type { Prisma } from "@/lib/generated/prisma/client"

const PAGE_SIZE = 20

async function assertAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") throw new Error("Unauthorized")
}

export async function writeAuditLog(
  actorId: string,
  action: string,
  targetType: string,
  targetId?: string | null,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId: targetId ?? null, metadata: metadata as Prisma.InputJsonValue },
  })
}

export async function getAuditLogs(page: number, actorId?: string | null, targetType?: string | null) {
  await assertAdmin()
  const where: Prisma.AuditLogWhereInput = {
    ...(actorId ? { actorId } : {}),
    ...(targetType ? { targetType } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total, pageSize: PAGE_SIZE }
}

export async function getAuditActionTypes(): Promise<string[]> {
  await assertAdmin()
  const rows = await prisma.auditLog.findMany({
    distinct: ["targetType"],
    select: { targetType: true },
    orderBy: { targetType: "asc" },
  })
  return rows.map((r) => r.targetType)
}
