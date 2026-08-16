"use client"

import { useState } from "react"
import Image from "next/image"

interface ImageGalleryProps {
  images: string[]
  productName: string
}

const PLACEHOLDER = "https://placehold.co/600x600/EDE9FE/7C3AED?text=No+Image"

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const displayImages = images.length > 0 ? images : [PLACEHOLDER]
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-brand-50">
        <Image
          src={displayImages[activeIndex]}
          alt={productName}
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover"
          priority
        />
      </div>
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {displayImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                i === activeIndex ? "border-brand-600" : "border-border hover:border-brand-400"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-text-secondary pt-1">
        <span>Share:</span>
        <div className="flex items-center gap-1.5">
          {["f", "t", "p"].map((initial) => (
            <span
              key={initial}
              className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-[10px] font-bold uppercase"
            >
              {initial}
            </span>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1 text-text-secondary">
          <span aria-hidden>♡</span> Favorite
        </span>
      </div>
    </div>
  )
}
