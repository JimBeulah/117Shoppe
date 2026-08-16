import { prisma } from "@/lib/db"
import { assertAdmin } from "@/lib/admin/actions"
import type { AdminPaymentRow } from "@/types/payments"

const PAGE_SIZE = 20

export async function getAdminPayments(
  page: number,
  statusFilter: string | null,
  search?: string | null
): Promise<{ payments: AdminPaymentRow[]; total: number; pageSize: number }> {
  await assertAdmin()
  const VALID_PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"]
  const where: any = {}
  if (statusFilter && VALID_PAYMENT_STATUSES.includes(statusFilter)) {
    where.status = statusFilter
  }
  if (search) {
    where.OR = [
      { orderId: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
      { order: { user: { name: { contains: search, mode: "insensitive" } } } },
    ]
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderId: true,
        method: true,
        provider: true,
        status: true,
        amount: true,
        reference: true,
        paidAt: true,
        order: { select: { id: true, status: true, user: { select: { name: true } }, refund: { select: { id: true } } } },
      },
    }),
    prisma.payment.count({ where }),
  ])

  return { payments, total, pageSize: PAGE_SIZE }
}
