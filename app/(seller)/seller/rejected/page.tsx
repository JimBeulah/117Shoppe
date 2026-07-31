import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { getCurrentShop } from "@/lib/seller/queries"

export default async function RejectedPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="max-w-md w-full text-center space-y-4 p-8 bg-white rounded-lg border border-border-default">
        <div className="text-5xl">❌</div>
        <h1 className="text-xl font-bold text-text-primary">Shop application rejected</h1>
        {shop.rejectionReason && (
          <p className="text-sm text-text-secondary bg-red-50 p-3 rounded border border-red-200">
            {shop.rejectionReason}
          </p>
        )}
        <p className="text-xs text-text-secondary">
          Contact{" "}
          <a href="mailto:support@shoppe.com" className="text-brand-600 hover:underline">
            support@shoppe.com
          </a>{" "}
          for assistance.
        </p>
      </div>
    </div>
  )
}
