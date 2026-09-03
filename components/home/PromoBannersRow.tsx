import Link from "next/link"
import { Truck, Coins, Gift } from "lucide-react"

const PERKS = [
  {
    icon: Truck,
    title: "Free Shipping",
    subtitle: "On orders over ₱500",
    href: "/free-shipping",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    icon: Coins,
    title: "Coins Cashback",
    subtitle: "Earn on every order",
    href: "/account/coins",
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
  {
    icon: Gift,
    title: "New User Deals",
    subtitle: "Up to 50% off",
    href: "/new-user",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
]

export function PromoBannersRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border border-border rounded-xl overflow-hidden bg-card">
      {PERKS.map(({ icon: Icon, title, subtitle, href, color, bg }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
        >
          <div className={`${bg} ${color} p-3 rounded-full shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
