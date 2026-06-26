import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getCart } from "@/lib/data/cart"
import { CartShopGroup } from "@/components/cart/CartShopGroup"
import { CartSummary } from "@/components/cart/CartSummary"
import { EmptyCart } from "@/components/cart/EmptyCart"

export const dynamic = "force-dynamic"

export default async function CartPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const groups = await getCart()

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-text-primary mb-6">Shopping Cart</h1>

        {!groups || groups.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
            <div className="space-y-4">
              {groups.map((group) => (
                <CartShopGroup key={group.shopId} group={group} />
              ))}
            </div>
            <CartSummary groups={groups} />
          </div>
        )}
      </div>
    </div>
  )
}
