"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignOutButton } from "@clerk/nextjs"

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Sellers", href: "/admin/sellers" },
  { label: "Payouts", href: "/admin/payouts" },
  { label: "Users", href: "/admin/users" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Brands", href: "/admin/brands" },
  { label: "Banners", href: "/admin/banners" },
  { label: "Vouchers", href: "/admin/vouchers" },
  { label: "Flash Sales", href: "/admin/flash-sales" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Audit Logs", href: "/admin/audit-logs" },
]

export default function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 sticky top-0 h-screen flex flex-col bg-white border-r border-border-default">
      <div className="p-4 border-b border-border-default">
        <p className="text-xs text-text-secondary uppercase tracking-wide">Platform Admin</p>
        <p className="text-xs text-text-secondary mt-0.5 truncate">{userName}</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded text-sm transition-colors ${
              pathname.startsWith(item.href)
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
