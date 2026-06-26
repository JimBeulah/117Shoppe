import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { Plus } from "lucide-react"
import { getUserAddresses } from "@/lib/data/checkout"
import { AddressCard } from "@/components/account/AddressCard"
import { AddressFormInline } from "@/components/account/AddressFormInline"

export const dynamic = "force-dynamic"

export default async function AddressesPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const addresses = await getUserAddresses()

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-text-primary">My Addresses</h1>

        {addresses.length === 0 && (
          <p className="text-sm text-text-secondary">No saved addresses yet.</p>
        )}

        <div className="space-y-3">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>

        <div className="bg-white rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-brand-600" />
            Add New Address
          </h2>
          <AddressFormInline />
        </div>
      </div>
    </div>
  )
}
