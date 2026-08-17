"use client"

import { useState, useTransition } from "react"
import { reviewReturnRequest } from "@/lib/seller/returns"

const REASON_LABELS: Record<string, string> = {
  ITEM_NOT_RECEIVED: "Item not received",
  ITEM_DEFECTIVE: "Item is damaged or defective",
  WRONG_ITEM_SENT: "Wrong item was sent",
  MISSING_PARTS: "Missing parts or accessories",
  NOT_AS_DESCRIBED: "Item doesn't match the description",
  CHANGED_MIND: "Changed mind",
  OTHER: "Other",
}

const TYPE_LABELS: Record<string, string> = {
  REFUND_ONLY: "Refund Only",
  RETURN_AND_REFUND: "Return & Refund",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_SELLER: "Awaiting your response",
  SELLER_APPROVED: "You approved this request",
  SELLER_REJECTED: "You declined this request",
  ADMIN_REVIEW: "Under platform review",
  ADMIN_APPROVED: "Approved by platform support",
  ADMIN_REJECTED: "Denied by platform support",
  CANCELLED: "Withdrawn by buyer",
  COMPLETED: "Completed",
}

interface Props {
  returnRequest: {
    id: string
    status: string
    type: string
    reason: string
    description: string
    evidenceUrls: string[]
    sellerReviewDeadline: Date | string
    sellerDecisionNote: string | null
    adminDecisionNote: string | null
  }
}

export function ReturnRequestReviewPanel({ returnRequest }: Props) {
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isPending_ = returnRequest.status === "PENDING_SELLER"

  function decide(decision: "APPROVE" | "REJECT") {
    setError(null)
    if (decision === "REJECT" && !note.trim()) {
      setError("Please explain why you're declining this request.")
      return
    }
    startTransition(async () => {
      const result = await reviewReturnRequest(returnRequest.id, decision, note)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <section className="bg-white rounded-lg border border-border-default p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text-primary text-sm">Return/Refund Request</h2>
        <span className="text-xs px-3 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
          {STATUS_LABELS[returnRequest.status] ?? returnRequest.status}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-text-secondary uppercase tracking-wide">Type</dt>
          <dd className="text-text-primary font-medium">{TYPE_LABELS[returnRequest.type] ?? returnRequest.type}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary uppercase tracking-wide">Reason</dt>
          <dd className="text-text-primary font-medium">{REASON_LABELS[returnRequest.reason] ?? returnRequest.reason}</dd>
        </div>
      </dl>

      <div>
        <dt className="text-xs text-text-secondary uppercase tracking-wide">Buyer&apos;s Description</dt>
        <dd className="text-sm text-text-primary mt-1">{returnRequest.description}</dd>
      </div>

      {returnRequest.evidenceUrls.length > 0 && (
        <div>
          <dt className="text-xs text-text-secondary uppercase tracking-wide mb-2">Evidence Photos</dt>
          <div className="flex flex-wrap gap-2">
            {returnRequest.evidenceUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt="Evidence"
                className="w-20 h-20 object-cover rounded border border-border-default"
              />
            ))}
          </div>
        </div>
      )}

      {isPending_ ? (
        <>
          <p className="text-xs text-text-secondary">
            Respond by{" "}
            {new Date(returnRequest.sellerReviewDeadline).toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            , or this will automatically escalate to platform support.
          </p>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
              Note (required if declining)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note for the buyer…"
              className="w-full border border-border-default rounded px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => decide("APPROVE")}
              disabled={isPending}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2 rounded text-sm transition-colors"
            >
              {isPending ? "Please wait…" : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => decide("REJECT")}
              disabled={isPending}
              className="flex-1 border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 py-2 rounded text-sm transition-colors"
            >
              {isPending ? "Please wait…" : "Decline"}
            </button>
          </div>
        </>
      ) : (
        <>
          {returnRequest.sellerDecisionNote && (
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Your note: </span>
              {returnRequest.sellerDecisionNote}
            </p>
          )}
          {returnRequest.adminDecisionNote && (
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Platform note: </span>
              {returnRequest.adminDecisionNote}
            </p>
          )}
        </>
      )}
    </section>
  )
}
