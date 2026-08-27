import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getWishlistPage } from "@/lib/data/wishlist"
import { WishlistRow } from "@/components/wishlist/WishlistRow"
import { Pagination } from "@/components/catalog/Pagination"

export const metadata = { title: "My Wishlist | 11/7 Shoppe" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function WishlistPage({ searchParams }: Props) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1) || 1)

  const { items, total, pageSize } = await getWishlistPage(page)

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-text-secondary">
        <p className="text-lg font-medium">Your wishlist is empty.</p>
        <p className="text-sm mt-1">Items you save will appear here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">My Wishlist</h1>
      {items.map((item) => (
        <WishlistRow key={item.id} item={item} />
      ))}
      <Pagination total={total} pageSize={pageSize} currentPage={page} />
    </div>
  )
}
