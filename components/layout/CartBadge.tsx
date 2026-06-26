import { getCartItemCount } from "@/lib/data/cart"

export async function CartBadge() {
  const count = await getCartItemCount()
  if (count === 0) return <span>0</span>
  return (
    <span>{count > 99 ? "99+" : count}</span>
  )
}
