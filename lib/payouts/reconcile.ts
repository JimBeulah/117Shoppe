import { prisma } from "@/lib/db"

export async function reconcileEligibleCommissions(shopId?: string) {
  await prisma.commissionEntry.updateMany({
    where: {
      status: "PENDING",
      eligibleAt: { lte: new Date() },
      ...(shopId ? { shopId } : {}),
    },
    data: { status: "AVAILABLE" },
  })
}
