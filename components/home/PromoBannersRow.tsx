import Image from "next/image"
import Link from "next/link"

const PROMO_BANNERS = [
  { imageUrl: "https://placehold.co/400x150/6D28D9/white?text=Free+Shipping", href: "/free-shipping", alt: "Free Shipping" },
  { imageUrl: "https://placehold.co/400x150/EC4899/white?text=Coins+Cashback", href: "/coins", alt: "Coins Cashback" },
  { imageUrl: "https://placehold.co/400x150/F59E0B/white?text=New+User+Deals", href: "/new-user", alt: "New User Deals" },
]

export function PromoBannersRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {PROMO_BANNERS.map((b) => (
        <Link key={b.href} href={b.href} className="relative aspect-[8/3] rounded-lg overflow-hidden group">
          <Image
            src={b.imageUrl}
            alt={b.alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
      ))}
    </div>
  )
}
