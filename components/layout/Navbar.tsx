"use client"

import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { UnreadBadge } from "@/components/chat/UnreadBadge"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { SearchBox } from "@/components/layout/SearchBox"
import { WishlistLink } from "@/components/layout/WishlistLink"
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
  return (
    <header className="bg-brand-700 text-white sticky top-0 z-50 shadow-md">
      {/* Mobile compact header */}
      <div className="md:hidden flex items-center gap-1.5 px-2 py-2 w-full overflow-hidden">
        <Link href="/" className="flex-shrink-0 leading-none">
          <span className="text-white font-bold text-sm tracking-tight">11/7</span>
        </Link>
        <SearchBox compact />
        <Link href="/cart" aria-label="Shopping cart" className="relative flex-shrink-0 p-1">
          <ShoppingCart size={20} />
          <span className="absolute -top-0.5 -right-0.5 bg-accent-sale text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
            {cartBadge ?? "0"}
          </span>
        </Link>
        <div className="flex-shrink-0 p-1">
          <NotificationBell />
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 transition-opacity hover:opacity-80">
            <span className="text-white font-bold text-xl tracking-tight leading-none">
              11/7<br />
              <span className="text-brand-100 text-sm font-semibold">Shoppe</span>
            </span>
          </Link>

          {/* Search */}
          <SearchBox />

          {/* Right actions */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <Link href="/cart" aria-label="Shopping cart" className="relative hover:text-brand-100 hover:scale-110 transition-all duration-200">
              <ShoppingCart size={22} />
              <span className="absolute -top-1.5 -right-1.5 bg-accent-sale text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartBadge ?? "0"}
              </span>
            </Link>
            <WishlistLink />
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
