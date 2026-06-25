import { cn } from "@/lib/utils"

type BadgeVariant = "sale" | "hot" | "free-shipping" | "new" | "trending"

const variants: Record<BadgeVariant, string> = {
  sale: "bg-accent-sale text-white",
  hot: "bg-accent-hot text-white",
  "free-shipping": "bg-success text-white",
  new: "bg-brand-600 text-white",
  trending: "bg-reward text-white",
}

export function Badge({ variant, label, className }: { variant: BadgeVariant; label: string; className?: string }) {
  return (
    <span className={cn("inline-block text-[10px] font-bold px-1.5 py-0.5 rounded leading-tight", variants[variant], className)}>
      {label}
    </span>
  )
}
