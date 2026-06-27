"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { label: "Dashboard", href: "/seller/dashboard" },
  { label: "All Products", href: "/seller/products" },
  { label: "Add Product", href: "/seller/products/new" },
  { label: "Orders", href: "/seller/orders" },
]

export default function SellerSidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-border-default flex-shrink-0">
      <div className="p-4 border-b border-border-default">
        <p className="text-xs text-text-secondary uppercase tracking-wide">Seller Centre</p>
        <p className="font-semibold text-sm text-text-primary mt-0.5 truncate">{shopName}</p>
      </div>
      <nav className="p-2 space-y-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded text-sm transition-colors ${
              pathname === item.href
                ? "bg-brand-600 text-white font-medium"
                : "text-text-secondary hover:bg-brand-50 hover:text-text-primary"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
