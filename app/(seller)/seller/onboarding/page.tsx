import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop } from "@/lib/seller/queries"
import OnboardingForm from "@/components/seller/OnboardingForm"

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (shop) {
    if (shop.status === "PENDING") redirect("/seller/pending")
    if (shop.status === "REJECTED") redirect("/seller/rejected")
    redirect("/seller/dashboard")
  }

  return <OnboardingForm />
}
