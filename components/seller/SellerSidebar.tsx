"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignOutButton } from "@clerk/nextjs"
import type { StaffPermission } from "@/lib/generated/prisma/client"

const NAV: { label: string; href: string; perm: StaffPermission | "OWNER_ONLY" | null }[] = [
  { label: "Dashboard", href: "/seller/dashboard", perm: null },
  { label: "All Products", href: "/seller/products", perm: "PRODUCTS" },
  { label: "Add Product", href: "/seller/products/new", perm: "PRODUCTS" },
  { label: "Orders", href: "/seller/orders", perm: "ORDERS" },
  { label: "Inventory", href: "/seller/inventory", perm: "INVENTORY" },
  { label: "Vouchers", href: "/seller/vouchers", perm: "VOUCHERS" },
  { label: "Reports", href: "/seller/reports", perm: "REPORTS" },
  { label: "Payouts", href: "/seller/payouts", perm: "OWNER_ONLY" },
  { label: "Reviews", href: "/seller/reviews", perm: "REVIEWS" },
  { label: "Messages", href: "/seller/chat", perm: "CHAT" },
  { label: "Shop Settings", href: "/seller/settings", perm: "OWNER_ONLY" },
  { label: "Staff", href: "/seller/settings/staff", perm: "OWNER_ONLY" },
]

interface Props {
  shopName: string
  userName: string
  isOwner: boolean
  permissions: StaffPermission[]
}

export default function SellerSidebar({ shopName, userName, isOwner, permissions }: Props) {
  const pathname = usePathname()

  const visibleNav = NAV.filter((item) => {
    if (item.perm === null) return true
    if (item.perm === "OWNER_ONLY") return isOwner
    return isOwner || permissions.includes(item.perm)
  })

  return (
    <aside className="w-56 flex-shrink-0 sticky top-0 h-screen flex flex-col bg-white border-r border-border-default">
      <div className="p-4 border-b border-border-default">
        <p className="text-xs text-text-secondary uppercase tracking-wide">Seller Centre</p>
        <p className="font-semibold text-sm text-text-primary mt-0.5 truncate">{shopName}</p>
        <p className="text-xs text-text-secondary mt-0.5 truncate flex items-center gap-1.5">
          {userName}
          {!isOwner && (
            <span className="text-[10px] font-medium text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded shrink-0">
              Staff
            </span>
          )}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {visibleNav.map((item) => (
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
      <div className="p-2 border-t border-border-default">
        <SignOutButton redirectUrl="/">
          <button className="w-full px-3 py-2 rounded text-sm text-left text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </aside>
  )
}
