import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getBuyerOrders } from "@/lib/data/orders"
import { getUserReviewedProductIds } from "@/lib/data/reviews"
import { OrderCard } from "@/components/account/OrderCard"

export const metadata = { title: "My Purchases | 11/7 Shoppe" }

export default async function OrdersPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const [orders, reviewedIds] = await Promise.all([
    getBuyerOrders(user.id),
    getUserReviewedProductIds(user.id),
  ])

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-text-secondary">
        <p className="text-lg font-medium">No orders yet.</p>
        <p className="text-sm mt-1">Your purchased items will appear here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">My Purchases</h1>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} reviewedProductIds={reviewedIds} />
      ))}
    </div>
  )
}
