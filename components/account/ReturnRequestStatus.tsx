"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { cancelReturnRequest } from "@/app/(shop)/account/orders/returns/actions"

const STATUS_LABELS: Record<string, string> = {
  PENDING_SELLER: "Awaiting seller response",
  SELLER_APPROVED: "Approved — processing refund",
  SELLER_REJECTED: "Declined by seller",
  ADMIN_REVIEW: "Under platform review",
  ADMIN_APPROVED: "Approved — processing refund",
  ADMIN_REJECTED: "Denied",
  CANCELLED: "Withdrawn",
  COMPLETED: "Completed",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_SELLER: "bg-yellow-100 text-yellow-700",
  SELLER_APPROVED: "bg-blue-100 text-blue-700",
  SELLER_REJECTED: "bg-red-100 text-red-700",
  ADMIN_REVIEW: "bg-yellow-100 text-yellow-700",
  ADMIN_APPROVED: "bg-blue-100 text-blue-700",
  ADMIN_REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-green-100 text-green-700",
}

interface Props {
  orderId: string
  status: string
  sellerDecisionNote?: string | null
  adminDecisionNote?: string | null
}

export function ReturnRequestStatus({ orderId, status, sellerDecisionNote, adminDecisionNote }: Props) {
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await cancelReturnRequest(orderId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      toast.success("Request withdrawn")
      router.refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <section className="bg-white rounded-lg border border-border-default p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text-primary text-sm">Return/Refund Request</h2>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>
      {sellerDecisionNote && (
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Seller note: </span>
          {sellerDecisionNote}
        </p>
      )}
      {adminDecisionNote && (
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Platform note: </span>
          {adminDecisionNote}
        </p>
      )}
      {status === "PENDING_SELLER" && (
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="text-sm text-text-secondary border border-border-default hover:bg-bg-page disabled:opacity-50 px-4 py-2 rounded transition-colors"
        >
          {mutation.isPending ? "Withdrawing…" : "Withdraw Request"}
        </button>
      )}
    </section>
  )
}
