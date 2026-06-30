"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"

interface SearchInputProps {
  placeholder?: string
  className?: string
  paramName?: string
  debounceMs?: number
}

export function SearchInput({
  placeholder = "Search...",
  className = "",
  paramName = "search",
  debounceMs = 300,
}: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get(paramName) ?? ""
  const [value, setValue] = React.useState(currentSearch)

  // Sync local state if search query changes in URL (e.g. back navigation or clear)
  React.useEffect(() => {
    setValue(currentSearch)
  }, [currentSearch])

  // Debounced search logic
  React.useEffect(() => {
    // If the value hasn't changed compared to the URL param, do nothing
    if (value === currentSearch) return

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) {
        params.set(paramName, value.trim())
      } else {
        params.delete(paramName)
      }
      params.set("page", "1") // reset page on search

      router.push(`${pathname}?${params.toString()}`)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [value, currentSearch, debounceMs, paramName, pathname, router, searchParams])

  const handleClear = () => {
    setValue("")
    const params = new URLSearchParams(searchParams.toString())
    params.delete(paramName)
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={`relative flex items-center max-w-md w-full ${className}`}>
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-text-secondary" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-9 pr-8 py-2 text-sm border border-border-default rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
