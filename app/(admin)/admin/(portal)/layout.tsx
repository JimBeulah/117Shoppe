import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import AdminSidebar from "@/components/admin/AdminSidebar"

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== "ADMIN") redirect("/")

  return (
    <div className="flex min-h-screen bg-bg-page">
      <AdminSidebar />
      <main className="flex-1 p-6 max-w-[1200px]">{children}</main>
    </div>
  )
}
