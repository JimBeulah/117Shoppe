"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import { assertAdmin } from "@/lib/admin/actions"
import { createNotification } from "@/lib/notifications/create"
import { buildPayoutPaidCopy, buildPayoutRejectedCopy } from "@/lib/notifications/copy"

export async function markPayoutPaid(payoutId: string, referenceNote: string): Promise<{ error?: string }> {
  await assertAdmin()
  const admin = await getCurrentUser()
  if (!admin) return { error: "Unauthorized" }

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { shop: { select: { ownerId: true } } },
  })
  if (!payout) return { error: "Payout not found" }
  if (payout.status !== "REQUESTED" && payout.status !== "PROCESSING") {
    return { error: "This payout has already been processed" }
  }

  await prisma.$transaction([
    prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "PAID",
        processedAt: new Date(),
        processedByUserId: admin.id,
        referenceNote: referenceNote || null,
      },
    }),
    prisma.commissionEntry.updateMany({
      where: { payoutId },
      data: { status: "PAID" },
    }),
  ])

  await createNotification({
    userId: payout.shop.ownerId,
    ...buildPayoutPaidCopy(payout.id, payout.amount),
  })

  revalidatePath("/admin/payouts")
  revalidatePath("/seller/payouts")
  return {}
}

export async function rejectPayoutRequest(payoutId: string, reason: string): Promise<{ error?: string }> {
  await assertAdmin()
  if (!reason.trim()) return { error: "A reason is required" }

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { shop: { select: { ownerId: true } } },
  })
  if (!payout) return { error: "Payout not found" }
  if (payout.status !== "REQUESTED" && payout.status !== "PROCESSING") {
    return { error: "This payout has already been processed" }
  }

  await prisma.$transaction([
    prisma.payout.update({
      where: { id: payoutId },
      data: { status: "REJECTED", processedAt: new Date(), referenceNote: reason },
    }),
    prisma.commissionEntry.updateMany({
      where: { payoutId },
      data: { payoutId: null },
    }),
  ])

  await createNotification({
    userId: payout.shop.ownerId,
    ...buildPayoutRejectedCopy(payout.id, reason),
  })

  revalidatePath("/admin/payouts")
  revalidatePath("/seller/payouts")
  return {}
}
