"use client"

import Link from "next/link"
import { Search, ShoppingCart, Bell } from "lucide-react"
import { useState } from "react"
import {
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs"
import { useAuth } from "@clerk/nextjs"

export function Navbar() {
  const [search, setSearch] = useState("")
  const { isSignedIn } = useAuth()

  return (
    <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-white font-bold text-xl tracking-tight leading-none">
              11/7<br />
              <span className="text-brand-100 text-sm font-semibold">Eshopee</span>
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 flex items-center bg-white rounded-sm overflow-hidden max-w-2xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, shops, brands..."
              className="flex-1 px-4 py-2 text-text-primary text-sm outline-none"
            />
            <button aria-label="Search" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 transition-colors">
              <Search size={18} />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button aria-label="Shopping cart" className="relative hover:text-brand-100 transition-colors">
              <ShoppingCart size={22} />
              <span className="absolute -top-1.5 -right-1.5 bg-accent-sale text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                0
              </span>
            </button>
            <button aria-label="Notifications" className="hover:text-brand-100 transition-colors">
              <Bell size={22} />
            </button>
            <div className="h-5 w-px bg-white/30" />

            {!isSignedIn ? (
              <>
                <SignInButton mode="redirect">
                  <button className="text-sm hover:text-brand-100 transition-colors font-medium">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="redirect">
                  <button className="text-sm border border-white/60 px-3 py-1 rounded hover:bg-white/10 transition-colors font-medium">
                    Register
                  </button>
                </SignUpButton>
              </>
            ) : (
              <UserButton
                userProfileUrl="/account/profile"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* Sub-nav */}
        <nav className="flex items-center gap-5 mt-2 text-xs text-white/80">
          {["Download the App", "Sell on Eshopee", "Help Center", "Flash Deals"].map((item) => (
            <Link key={item} href="#" className="hover:text-white transition-colors">
              {item}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
