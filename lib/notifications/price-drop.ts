import { prisma } from "@/lib/db"
import { createNotification } from "@/lib/notifications/create"
import { buildPriceDropCopy } from "@/lib/notifications/copy"

export async function notifyWishlistPriceDrop(
  productId: string,
  productName: string,
  productSlug: string,
  oldPrice: number,
  newPrice: number
) {
  if (newPrice >= oldPrice) return

  const savers = await prisma.wishlist.findMany({
    where: { productId },
    select: { userId: true },
  })
  if (savers.length === 0) return

  const copy = buildPriceDropCopy(productName, productSlug, oldPrice, newPrice)
  await Promise.all(savers.map((s) => createNotification({ userId: s.userId, ...copy })))
}
