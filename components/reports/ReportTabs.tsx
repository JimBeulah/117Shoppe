"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface Tab {
  slug: string
  label: string
}

interface Props {
  basePath: string
  tabs: Tab[]
}

export function ReportTabs({ basePath, tabs }: Props) {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 border-b border-border-default">
      {tabs.map((tab) => {
        const href = tab.slug ? `${basePath}/${tab.slug}` : basePath
        const isActive = pathname === href
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              isActive
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
