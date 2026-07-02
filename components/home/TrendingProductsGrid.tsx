import Image from "next/image"
import Link from "next/link"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { formatPrice } from "@/lib/utils"
import type { ProductCard as ProductCardType } from "@/types"

export function TrendingProductsGrid({ products }: { products: ProductCardType[] }) {
  return (
    <div className="bg-white rounded-lg p-2.5 border border-border/50 shadow-sm">
      <SectionHeader title="Trending" href="/trending" />
      <div className="grid grid-cols-2 gap-1.5">
        {products.slice(0, 2).map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="group relative aspect-[4/3] rounded overflow-hidden bg-brand-50">
            <Image
              src={p.images[0] ?? "https://placehold.co/200x200/EDE9FE/7C3AED?text=Product"}
              alt={p.name}
              fill
              sizes="120px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute bottom-0 inset-x-0 bg-black/40 px-1 py-0.5">
              <span className="text-[10px] font-medium text-white truncate block">{p.name}</span>
              <span className="text-[10px] font-bold text-white truncate block">{formatPrice(p.price)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
