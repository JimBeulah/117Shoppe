import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop } from "@/lib/seller/queries"
import SellerSidebar from "@/components/seller/SellerSidebar"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  if (user.role !== "SELLER") redirect("/seller/onboarding")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")
  if (shop.status === "PENDING") redirect("/seller/pending")
  if (shop.status === "REJECTED") redirect("/seller/rejected")

  return (
    <div className="flex min-h-screen bg-bg-page">
      <SellerSidebar shopName={shop.name} userName={user.name} />
      <main className="flex-1 p-6 max-w-[1200px]">{children}</main>
    </div>
  )
}
