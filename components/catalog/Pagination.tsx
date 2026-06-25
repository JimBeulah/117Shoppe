"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface PaginationProps {
  total: number
  pageSize: number
  currentPage: number
}

export function Pagination({ total, pageSize, currentPage }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / pageSize)

  if (totalPages <= 1) return null

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-center gap-1 py-6" role="navigation" aria-label="Pagination">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 rounded text-sm border border-border disabled:opacity-40 hover:border-brand-400 transition-colors"
      >
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => goToPage(p)}
          aria-current={p === currentPage ? "page" : undefined}
          className={`px-3 py-1.5 rounded text-sm border transition-colors ${
            p === currentPage
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border hover:border-brand-400"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded text-sm border border-border disabled:opacity-40 hover:border-brand-400 transition-colors"
      >
        Next
      </button>
    </div>
  )
}
