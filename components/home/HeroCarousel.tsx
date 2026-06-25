"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import type { BannerItem } from "@/types"

export function HeroCarousel({ banners }: { banners: BannerItem[] }) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent((c) => (c + 1) % banners.length), [banners.length])

  useEffect(() => {
    const timer = setInterval(next, 4000)
    return () => clearInterval(timer)
  }, [next])

  if (!banners.length) return null

  return (
    <div className="relative w-full aspect-[3/1] overflow-hidden bg-brand-100 rounded-lg">
      {banners.map((banner, i) => (
        <Link
          key={banner.id}
          href={banner.linkUrl ?? "#"}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            src={banner.imageUrl}
            alt={banner.title ?? "Banner"}
            fill
            priority={i === 0}
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
          />
        </Link>
      ))}

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/50"}`}
          />
        ))}
      </div>

      {/* Arrows */}
      <button onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors">‹</button>
      <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors">›</button>
    </div>
  )
}
