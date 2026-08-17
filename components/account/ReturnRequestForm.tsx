"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { requestReturn } from "@/app/(shop)/account/orders/returns/actions"
import ProductImageUploader from "@/components/seller/ProductImageUploader"

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "ITEM_NOT_RECEIVED", label: "I haven't received my item" },
  { value: "ITEM_DEFECTIVE", label: "Item is damaged or defective" },
  { value: "WRONG_ITEM_SENT", label: "Wrong item was sent" },
  { value: "MISSING_PARTS", label: "Missing parts or accessories" },
  { value: "NOT_AS_DESCRIBED", label: "Item doesn't match the description" },
  { value: "CHANGED_MIND", label: "Changed my mind" },
  { value: "OTHER", label: "Other" },
]

const NOT_RECEIVED_REASON = "ITEM_NOT_RECEIVED"

interface Props {
  orderId: string
}

export function ReturnRequestForm({ orderId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("ITEM_DEFECTIVE")
  const [description, setDescription] = useState("")
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])

  const type = reason === NOT_RECEIVED_REASON ? "REFUND_ONLY" : "RETURN_AND_REFUND"

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await requestReturn({
        orderId,
        type: type as "REFUND_ONLY" | "RETURN_AND_REFUND",
        reason: reason as
          | "ITEM_NOT_RECEIVED"
          | "ITEM_DEFECTIVE"
          | "WRONG_ITEM_SENT"
          | "MISSING_PARTS"
          | "NOT_AS_DESCRIBED"
          | "CHANGED_MIND"
          | "OTHER",
        description,
        evidenceUrls,
      })
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      toast.success("Return/refund request submitted")
      setOpen(false)
      router.refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-500 border border-red-200 hover:bg-red-50 px-4 py-2 rounded transition-colors"
      >
        Request Return/Refund
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 space-y-4 max-h-[85vh] overflow-y-auto">
            <h2 className="font-semibold text-text-primary">Request Return/Refund</h2>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-border-default rounded px-3 py-2 text-sm"
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-secondary">
                {type === "REFUND_ONLY"
                  ? "This will be processed as a refund only — no item return needed."
                  : "You may be asked to ship the item back to the seller."}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Details</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the issue in detail…"
                className="w-full border border-border-default rounded px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">
                Evidence Photos <span className="text-text-secondary font-normal">(optional, up to 5)</span>
              </label>
              <ProductImageUploader
                endpoint="returnEvidence"
                value={evidenceUrls}
                onChange={setEvidenceUrls}
                maxFiles={5}
                label="Upload Photos"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !description.trim()}
                className="flex-1 disabled:opacity-50 bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded text-sm transition-colors"
              >
                {mutation.isPending ? "Submitting…" : "Submit Request"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-border-default text-text-secondary hover:bg-bg-page py-2 rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
