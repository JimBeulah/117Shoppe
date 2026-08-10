export interface SellerBalance {
  pending: number
  available: number
  lifetimePaid: number
  hasOpenPayout: boolean
}

export interface SellerPayoutRow {
  id: string
  amount: number
  status: string
  requestedAt: Date
  processedAt: Date | null
  referenceNote: string | null
}

export interface AdminPayoutRow {
  id: string
  amount: number
  status: string
  requestedAt: Date
  processedAt: Date | null
  referenceNote: string | null
  shop: { name: string }
}
