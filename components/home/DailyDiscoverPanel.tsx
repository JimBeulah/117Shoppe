import Image from "next/image"
import Link from "next/link"
import { SectionHeader } from "@/components/ui/SectionHeader"
import type { ProductCard } from "@/types"
import { formatPrice } from "@/lib/utils"

export function DailyDiscoverPanel({ products }: { products: ProductCard[] }) {
  return (
    <div className="bg-white rounded-lg p-4 flex-1">
      <SectionHeader title="Daily Discover" href="/discover" />
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 4).map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="group flex flex-col gap-1">
            <div className="relative aspect-square rounded overflow-hidden bg-brand-50">
              <Image
                src={p.images[0] ?? "https://placehold.co/200x200/EDE9FE/7C3AED?text=Product"}
                alt={p.name}
                fill
                sizes="120px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <span className="text-[10px] font-bold text-accent-sale">{formatPrice(p.price)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
