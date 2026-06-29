import { redirect } from "next/navigation"
import { getCurrentShop } from "@/lib/seller/queries"
import ShopSettingsForm from "@/components/seller/ShopSettingsForm"

export const metadata = { title: "Shop Settings | Seller Centre" }

export default async function SettingsPage() {
  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Shop Settings</h1>
      <div className="bg-white rounded-lg border border-border-default p-6">
        <ShopSettingsForm
          initialName={shop.name}
          initialLogo={shop.logo}
          initialBanner={shop.banner}
          slug={shop.slug}
        />
      </div>
    </div>
  )
}
