export interface AdminPaymentRow {
  id: string
  orderId: string
  method: string
  provider: string
  status: string
  amount: number
  reference: string | null
  paidAt: Date | null
  order: {
    id: string
    status: string
    user: { name: string }
    refund: { id: string } | null
  }
}
