"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { CategoryItem } from "@/types"
import { CategoryIcon } from "@/components/ui/CategoryIcon"
import { ChevronLeft, ChevronRight } from "lucide-react"

const COLUMN_WIDTH = 76
const COLUMN_GAP = 8

export function CategoryBar({ categories }: { categories: CategoryItem[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const columnCount = Math.ceil(categories.length / 2)

  const checkScroll = () => {
    const container = scrollContainerRef.current
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      )
    }
  }

  useLayoutEffect(() => {
    checkScroll()
  }, [categories])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const observer = new ResizeObserver(checkScroll)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current
    if (container) {
      const scrollAmount = container.clientWidth * 0.9
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
      setTimeout(checkScroll, 300)
    }
  }

  return (
    <div className="bg-white rounded-sm border border-border p-2 md:p-4">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
          onScroll={checkScroll}
        >
          <div
            className="grid grid-flow-col grid-rows-2 gap-x-2 gap-y-4"
            style={{
              gridAutoColumns: COLUMN_WIDTH,
              width: columnCount * COLUMN_WIDTH + (columnCount - 1) * COLUMN_GAP,
            }}
          >
            {categories.map((cat) => (
              <CategoryIcon key={cat.id} category={cat} />
            ))}
          </div>
        </div>

        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow border border-border"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="w-5 h-5 text-text-primary" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow border border-border"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-5 h-5 text-text-primary" />
          </button>
        )}
      </div>
    </div>
  )
}
