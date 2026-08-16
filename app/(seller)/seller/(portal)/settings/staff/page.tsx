import { redirect } from "next/navigation"
import { getCurrentShop, getShopStaff } from "@/lib/seller/queries"
import StaffManager from "@/components/seller/StaffManager"

export const metadata = { title: "Staff | Seller Centre" }

export default async function StaffPage() {
  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  const staff = await getShopStaff(shop.id)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Staff</h1>
      <StaffManager initialStaff={staff} />
    </div>
  )
}
