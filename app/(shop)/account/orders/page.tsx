import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getBuyerOrders } from "@/lib/data/orders"
import { getUserReviewedProductIds } from "@/lib/data/reviews"
import { OrderCard } from "@/components/account/OrderCard"
import { Pagination } from "@/components/catalog/Pagination"

export const metadata = { title: "My Purchases | 11/7 Shoppe" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function OrdersPage({ searchParams }: Props) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1) || 1)

  const [{ orders, total, pageSize }, reviewedIds] = await Promise.all([
    getBuyerOrders(user.id, page),
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
      <Pagination total={total} pageSize={pageSize} currentPage={page} />
    </div>
  )
}
