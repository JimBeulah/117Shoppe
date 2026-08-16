"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, Clock, TrendingUp } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/Popover"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { recordSearch } from "@/app/(shop)/search/actions"
import type { SearchSuggestionsResponse } from "@/types/search"

export function SearchBox() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [, startTransition] = useTransition()
  const anchorRef = useRef<HTMLFormElement>(null)
  const [value, setValue] = useState("")
  const [open, setOpen] = useState(false)
  const debouncedValue = useDebouncedValue(value, 300)
  const trimmed = debouncedValue.trim()

  const { data } = useQuery<SearchSuggestionsResponse>({
    queryKey: ["search-suggestions", trimmed],
    queryFn: async () => {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`)
      return res.json()
    },
    enabled: open,
    staleTime: 30 * 1000,
  })

  function submitSearch(q: string) {
    const query = q.trim()
    startTransition(async () => {
      await recordSearch(query)
      queryClient.invalidateQueries({ queryKey: ["search-suggestions"] })
    })
    setOpen(false)
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search")
  }

  function goToProduct(slug: string, name: string) {
    startTransition(async () => {
      await recordSearch(name)
      queryClient.invalidateQueries({ queryKey: ["search-suggestions"] })
    })
    setOpen(false)
    router.push(`/product/${slug}`)
  }

  function pickTerm(term: string) {
    setValue(term)
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(term)}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitSearch(value)
  }

  const showProducts = trimmed.length >= 2
  const products = data?.products ?? []
  const recentSearches = data?.recentSearches ?? []
  const popularSearches = data?.popularSearches ?? []
  const hasSuggestions = showProducts
    ? products.length > 0
    : recentSearches.length > 0 || popularSearches.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <form
          ref={anchorRef}
          onSubmit={handleSubmit}
          className="flex-1 flex items-center bg-white rounded-md"
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search products, shops, brands..."
            className="flex-1 px-4 py-2.5 text-text-primary text-sm outline-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 my-1 mr-1 rounded flex items-center transition-colors"
          >
            <Search size={18} />
          </button>
        </form>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[28rem] max-w-[90vw] text-text-primary p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault()
        }}
      >
        {!hasSuggestions ? (
          <p className="px-4 py-6 text-center text-sm text-text-secondary">
            {showProducts ? "No matching products" : "Start typing to search"}
          </p>
        ) : showProducts ? (
          <ul className="max-h-96 overflow-y-auto py-1">
            {products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => goToProduct(p.slug, p.name)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-surface-hover transition-colors"
                >
                  <span className="relative w-9 h-9 flex-shrink-0 rounded overflow-hidden bg-surface-muted">
                    {p.image && <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />}
                  </span>
                  <span className="text-sm truncate">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-2">
            {recentSearches.length > 0 && (
              <div className="px-4 py-1.5">
                <p className="text-xs font-semibold text-text-secondary mb-1">Recent searches</p>
                <ul>
                  {recentSearches.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => pickTerm(term)}
                        className="w-full flex items-center gap-2 py-1.5 text-left text-sm hover:text-brand-600 transition-colors"
                      >
                        <Clock size={14} className="text-text-secondary flex-shrink-0" />
                        <span className="truncate">{term}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {popularSearches.length > 0 && (
              <div className="px-4 py-1.5">
                <p className="text-xs font-semibold text-text-secondary mb-1">Popular searches</p>
                <ul>
                  {popularSearches.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => pickTerm(term)}
                        className="w-full flex items-center gap-2 py-1.5 text-left text-sm hover:text-brand-600 transition-colors"
                      >
                        <TrendingUp size={14} className="text-text-secondary flex-shrink-0" />
                        <span className="truncate">{term}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
