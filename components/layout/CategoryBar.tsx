"use client"

import { useLayoutEffect, useRef, useState } from "react"
import type { CategoryItem } from "@/types"
import { CategoryIcon } from "@/components/ui/CategoryIcon"
import { ChevronLeft, ChevronRight } from "lucide-react"

const VISIBLE_COLUMNS = 10
const COLUMN_GAP = 8

export function CategoryBar({ categories }: { categories: CategoryItem[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [columnWidth, setColumnWidth] = useState(0)
  const columnCount = Math.ceil(categories.length / 2)

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const updateColumnWidth = () => {
      const availableWidth = wrapper.clientWidth - (VISIBLE_COLUMNS - 1) * COLUMN_GAP
      setColumnWidth(availableWidth / VISIBLE_COLUMNS)
    }

    updateColumnWidth()
    const observer = new ResizeObserver(updateColumnWidth)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  const checkScroll = () => {
    const container = scrollContainerRef.current
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      )
    }
  }

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current
    if (container) {
      const scrollAmount = (columnWidth + COLUMN_GAP) * VISIBLE_COLUMNS
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
      setTimeout(checkScroll, 300)
    }
  }

  return (
    <div className="bg-white rounded-sm border border-border p-4">
      <div ref={wrapperRef} className="relative">
        <div
          ref={scrollContainerRef}
          className="overflow-x-hidden"
          onScroll={checkScroll}
        >
          <div
            className="grid grid-flow-col grid-rows-2 gap-x-2 gap-y-4"
            style={{
              gridAutoColumns: columnWidth || undefined,
              width: columnWidth
                ? columnCount * columnWidth + (columnCount - 1) * COLUMN_GAP
                : undefined,
              visibility: columnWidth ? "visible" : "hidden",
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow border border-border"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="w-5 h-5 text-text-primary" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow border border-border"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-5 h-5 text-text-primary" />
          </button>
        )}
      </div>
    </div>
  )
}
