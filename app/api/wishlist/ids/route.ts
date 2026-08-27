import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/data/user"
import { getWishlistProductIds } from "@/lib/data/wishlist"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ids: [] })

  const ids = await getWishlistProductIds()
  return NextResponse.json({ ids })
}
