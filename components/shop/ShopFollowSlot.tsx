import { getCurrentUser } from "@/lib/data/user"
import { prisma } from "@/lib/db"
import { FollowButton } from "./FollowButton"

interface Props {
  shopId: string
  shopSlug: string
  initialCount: number
}

// Isolated in its own async component so only this subtree — not the whole
// shop page — is opted into dynamic rendering by the auth() call inside
// getCurrentUser(). Keeps the product grid/shop header on the page's
// declared `revalidate` cache instead of forcing the entire route dynamic.
export async function ShopFollowSlot({ shopId, shopSlug, initialCount }: Props) {
  const user = await getCurrentUser()

  const shopFollow = user
    ? await prisma.shopFollow.findUnique({
        where: { userId_shopId: { userId: user.id, shopId } },
      })
    : null

  return (
    <FollowButton
      shopId={shopId}
      shopSlug={shopSlug}
      initialFollowing={shopFollow !== null}
      initialCount={initialCount}
      isSignedIn={user !== null}
    />
  )
}
