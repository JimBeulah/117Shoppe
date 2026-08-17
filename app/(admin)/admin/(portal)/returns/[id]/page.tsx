import { notFound } from "next/navigation"
import Link from "next/link"
import { getAdminReturnRequestDetail, mediateReturnRequest } from "@/lib/admin/returns"
import { OrderTimeline } from "@/components/orders/OrderTimeline"
import { formatPrice } from "@/lib/utils"

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

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminReturnDetailPage({ params }: Props) {
  const { id } = await params
  const returnRequest = await getAdminReturnRequestDetail(id)
  if (!returnRequest) notFound()

  const order = returnRequest.order
  const canMediate = returnRequest.status === "ADMIN_REVIEW"

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          Return Request — Order #{order.id.slice(-8).toUpperCase()}
        </h1>
        <Link href="/admin/returns" className="text-sm text-brand-600 hover:underline">
          ← Back
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-text-secondary">Buyer</p>
            <p className="text-sm font-medium text-text-primary">{order.user.name}</p>
            <p className="text-xs text-text-secondary">{order.user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Shop</p>
            <p className="text-sm font-medium text-text-primary">{order.shop.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Status</p>
            <p className="text-sm font-medium text-text-primary">{returnRequest.status.replaceAll("_", " ")}</p>
          </div>
        </div>
        <hr className="border-border-default" />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-text-secondary uppercase tracking-wide">Type</dt>
            <dd className="text-text-primary font-medium">{TYPE_LABELS[returnRequest.type]}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-secondary uppercase tracking-wide">Reason</dt>
            <dd className="text-text-primary font-medium">{REASON_LABELS[returnRequest.reason]}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-secondary uppercase tracking-wide">Order Total</dt>
            <dd className="text-text-primary font-medium">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wide">Buyer&apos;s Description</p>
          <p className="text-sm text-text-primary mt-1">{returnRequest.description}</p>
        </div>
        {returnRequest.evidenceUrls.length > 0 && (
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">Evidence Photos</p>
            <div className="flex flex-wrap gap-2">
              {returnRequest.evidenceUrls.map((url) => (
                <img key={url} src={url} alt="Evidence" className="w-20 h-20 object-cover rounded border border-border-default" />
              ))}
            </div>
          </div>
        )}
        {returnRequest.sellerDecisionNote && (
          <div className="pt-2 border-t border-border-default">
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Seller Decision {returnRequest.sellerDecidedBy && `(${returnRequest.sellerDecidedBy.name})`}
            </p>
            <p className="text-sm text-text-primary mt-1">{returnRequest.sellerDecisionNote}</p>
          </div>
        )}
      </div>

      {canMediate && (
        <form className="bg-white rounded-lg border border-border-default p-5 space-y-3">
          <h2 className="font-semibold text-sm text-text-primary">Platform Decision</h2>
          <input type="hidden" name="returnRequestId" value={returnRequest.id} />
          <textarea
            name="note"
            required
            rows={3}
            className="w-full text-sm border border-border-default rounded px-3 py-2"
            placeholder="Explain your decision…"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                await mediateReturnRequest(
                  fd.get("returnRequestId") as string,
                  "APPROVE",
                  fd.get("note") as string
                )
              }}
              className="text-sm px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded"
            >
              Approve
            </button>
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                await mediateReturnRequest(
                  fd.get("returnRequestId") as string,
                  "REJECT",
                  fd.get("note") as string
                )
              }}
              className="text-sm px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded"
            >
              Deny
            </button>
          </div>
        </form>
      )}

      {returnRequest.adminDecisionNote && (
        <div className="bg-white rounded-lg border border-border-default p-5">
          <p className="text-xs text-text-secondary uppercase tracking-wide">
            Admin Decision {returnRequest.adminDecidedBy && `(${returnRequest.adminDecidedBy.name})`}
          </p>
          <p className="text-sm text-text-primary mt-1">{returnRequest.adminDecisionNote}</p>
        </div>
      )}

      {order.payment?.provider === "COD" && order.refund?.status === "PENDING" && (
        <div className="bg-white rounded-lg border border-border-default p-5">
          <p className="text-sm text-text-secondary">
            This refund is for a COD order and requires manual settlement outside the platform. Mark it as
            settled from the order&apos;s payment section once completed.
          </p>
          <Link href={`/admin/orders/${order.id}`} className="text-sm text-brand-600 hover:underline mt-2 inline-block">
            Go to Order →
          </Link>
        </div>
      )}

      <OrderTimeline events={order.timelineEvents} />
    </div>
  )
}
