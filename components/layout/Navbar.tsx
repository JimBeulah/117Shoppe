"use client"

import Link from "next/link"
import { Search, ShoppingCart } from "lucide-react"
import { UnreadBadge } from "@/components/chat/UnreadBadge"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs"

interface NavbarProps {
  cartBadge?: React.ReactNode
}

export function Navbar({ cartBadge }: NavbarProps) {
  const [search, setSearch] = useState("")
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    } else {
      router.push("/search")
    }
  }

  return (
    <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 transition-opacity hover:opacity-80">
            <span className="text-white font-bold text-xl tracking-tight leading-none">
              11/7<br />
              <span className="text-brand-100 text-sm font-semibold">Shoppe</span>
            </span>
          </Link>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex-1 flex items-center bg-white rounded-md"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          {/* Right actions */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <Link href="/cart" aria-label="Shopping cart" className="relative hover:text-brand-100 hover:scale-110 transition-all duration-200">
              <ShoppingCart size={22} />
              <span className="absolute -top-1.5 -right-1.5 bg-accent-sale text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartBadge ?? "0"}
              </span>
            </Link>
            <UnreadBadge />
            <NotificationBell />
            <div className="h-5 w-px bg-white/30" />

            <Show
              when="signed-out"
              fallback={
                <UserButton
                  userProfileMode="navigation"
                  userProfileUrl="/account/profile"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                    },
                  }}
                />
              }
            >
              <SignInButton mode="redirect">
                <button className="text-sm hover:text-brand-100 hover:underline transition-all duration-200 font-medium">
                  Login
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button className="text-sm border border-white/60 px-3 py-1 rounded hover:bg-white/20 hover:border-white transition-all duration-200 font-medium">
                  Register
                </button>
              </SignUpButton>
            </Show>
          </div>
        </div>

        {/* Sub-nav */}
        <nav className="flex items-center gap-5 mt-2 pt-2 border-t border-white/10 text-xs text-white/80">
          <Link href="#" className="hover:text-white hover:underline transition-all duration-200">
            Download the App
          </Link>
          <Link href="/seller/onboarding" className="hover:text-white hover:underline transition-all duration-200">
            Sell on 11/7 Shoppe
          </Link>
          <Link href="#" className="hover:text-white hover:underline transition-all duration-200">
            Help Center
          </Link>
          <Link href="#" className="hover:text-white hover:underline transition-all duration-200">
            Flash Deals
          </Link>
        </nav>
      </div>
    </header>
  )
}
