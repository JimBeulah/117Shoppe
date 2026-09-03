import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getCart } from "@/lib/data/cart"
import { getUserAddresses } from "@/lib/data/checkout"
import { getCurrentUser } from "@/lib/data/user"
import { getCoinBalance } from "@/lib/data/coins"
import { CheckoutShell } from "@/components/checkout/CheckoutShell"

export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const [groups, addresses, { balance }] = await Promise.all([
    getCart(),
    getUserAddresses(),
    getCoinBalance(user.id),
  ])

  if (!groups || groups.length === 0) redirect("/cart")

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-text-primary mb-6">Checkout</h1>
        <CheckoutShell addresses={addresses} groups={groups} coinBalance={balance} />
      </div>
    </div>
  )
}
