const PAYMONGO_API = "https://api.paymongo.com/v1"

type PaymongoRefundReason = "duplicate" | "fraudulent" | "requested_by_customer" | "others"

export interface PaymongoLink {
  id: string
  attributes: {
    amount: number
    checkout_url: string
    status: string
    description: string
  }
}

export interface PaymongoRefund {
  id: string
  attributes: {
    amount: number
    status: string
    reason: string
    payment_id: string
  }
}

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set")
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`
}

function toCentavos(amountPHP: number): number {
  return Math.round(amountPHP * 100)
}

function mapRefundReason(reason: string): PaymongoRefundReason {
  const normalized = reason.trim().toLowerCase()
  if (normalized === "duplicate" || normalized === "fraudulent" || normalized === "requested_by_customer") {
    return normalized
  }
  return "others"
}

async function paymongoFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${PAYMONGO_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...init.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`PayMongo request failed (${res.status} ${path}): ${body}`)
  }

  const json = await res.json()
  return json.data as T
}

export async function createPaymongoLink(amountPHP: number, description: string): Promise<PaymongoLink> {
  return paymongoFetch<PaymongoLink>("/links", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          amount: toCentavos(amountPHP),
          description,
          remarks: description,
        },
      },
    }),
  })
}

export async function retrievePaymongoLink(linkId: string): Promise<PaymongoLink> {
  return paymongoFetch<PaymongoLink>(`/links/${linkId}`, { method: "GET" })
}

export async function createPaymongoRefund(
  paymentId: string,
  amountPHP: number,
  reason: string
): Promise<PaymongoRefund> {
  return paymongoFetch<PaymongoRefund>("/refunds", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          amount: toCentavos(amountPHP),
          payment_id: paymentId,
          reason: mapRefundReason(reason),
        },
      },
    }),
  })
}
