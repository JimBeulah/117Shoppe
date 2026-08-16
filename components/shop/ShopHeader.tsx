import Image from "next/image"
import { FollowButton } from "./FollowButton"
import type { ShopDetail } from "@/types"

interface Props {
  shop: ShopDetail
  initialFollowing: boolean
  isSignedIn: boolean
}

export function ShopHeader({ shop, initialFollowing, isSignedIn }: Props) {
  const joinedDate = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(new Date(shop.createdAt))

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-white mb-6">
      {/* Banner */}
      <div className="relative h-40 bg-brand-600">
        {shop.banner && (
          <Image
            src={shop.banner}
            alt={`${shop.name} banner`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
      </div>

      {shop.isOnVacation && (
        <div className="bg-amber-50 border-t border-b border-amber-200 text-amber-800 text-sm px-5 py-2">
          This seller is on vacation and temporarily not accepting new orders.
          {shop.vacationMessage && <> {shop.vacationMessage}</>}
        </div>
      )}

      {/* Logo + info row */}
      <div className="px-5 pb-4">
        <div className="flex items-end gap-4 -mt-9 mb-3">
          {/* Logo */}
          <div className="relative rounded-full overflow-hidden border-4 border-white bg-brand-100 flex-shrink-0 shadow-sm"
               style={{ width: 72, height: 72 }}>
            {shop.logo ? (
              <Image
                src={shop.logo}
                alt={shop.name}
                fill
                sizes="72px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-600 font-bold text-2xl">
                {shop.name[0]}
              </div>
            )}
          </div>

          {/* Name + stats */}
          <div className="flex-1 min-w-0 pt-10">
            <h1 className="text-lg font-bold text-text-primary truncate">{shop.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-text-secondary">
              <span>★ {shop.rating.toFixed(1)}</span>
              <span>{shop._count.products.toLocaleString()} products</span>
              <span>Joined {joinedDate}</span>
            </div>
          </div>

          {/* Follow button */}
          <div className="flex-shrink-0 pt-10">
            <FollowButton
              shopId={shop.id}
              shopSlug={shop.slug}
              initialFollowing={initialFollowing}
              initialCount={shop.followersCount}
              isSignedIn={isSignedIn}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
