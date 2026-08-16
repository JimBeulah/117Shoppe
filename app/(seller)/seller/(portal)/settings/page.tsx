import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentShop } from "@/lib/seller/queries"
import ShopSettingsForm from "@/components/seller/ShopSettingsForm"
import VacationModeToggle from "@/components/seller/VacationModeToggle"

export const metadata = { title: "Shop Settings | Seller Centre" }

export default async function SettingsPage() {
  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Shop Settings</h1>
        <Link href="/seller/settings/staff" className="text-sm text-brand-600 hover:underline">
          Manage Staff →
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-border-default p-6">
        <ShopSettingsForm
          initialName={shop.name}
          initialLogo={shop.logo}
          initialBanner={shop.banner}
          slug={shop.slug}
        />
      </div>
      <VacationModeToggle
        initialIsOnVacation={shop.isOnVacation}
        initialVacationMessage={shop.vacationMessage}
      />
    </div>
  )
}
