"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/orders", label: "Purchases" },
  { href: "/account/addresses", label: "Addresses" },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <nav className="flex gap-6 border-b border-border text-sm font-medium">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`py-3 border-b-2 transition-colors ${
                  isActive
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-text-secondary hover:text-brand-600"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
      {children}
    </div>
  )
}
