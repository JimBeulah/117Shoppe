import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import AdminSidebar from "@/components/admin/AdminSidebar"

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") redirect("/")

  return (
    <div className="flex min-h-screen bg-bg-page">
      <AdminSidebar userName={user.name} />
      <main className="flex-1 p-6 max-w-[1200px]">{children}</main>
    </div>
  )
}
