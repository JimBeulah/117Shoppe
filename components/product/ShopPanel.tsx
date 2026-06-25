import Image from "next/image"
import Link from "next/link"

interface ShopPanelProps {
  shop: {
    id: string
    name: string
    slug: string
    logo: string | null
    rating: number
    followersCount: number
  }
}

export function ShopPanel({ shop }: ShopPanelProps) {
  return (
    <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-brand-100 flex-shrink-0">
        {shop.logo ? (
          <Image src={shop.logo} alt={shop.name} fill sizes="48px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-600 font-bold text-lg">
            {shop.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-text-primary truncate">{shop.name}</p>
        <p className="text-xs text-text-secondary">
          ★ {shop.rating.toFixed(1)} · {shop.followersCount.toLocaleString()} followers
        </p>
      </div>
      <Link
        href={`/shop/${shop.slug}`}
        className="flex-shrink-0 px-3 py-1.5 border border-brand-600 text-brand-600 rounded text-xs font-medium hover:bg-brand-50 transition-colors"
      >
        Visit Shop
      </Link>
    </div>
  )
}
