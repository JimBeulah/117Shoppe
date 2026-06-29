import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"

export default async function AuthRedirectPage() {
  const user = await getCurrentUser()
  if (user?.role === "ADMIN") redirect("/admin/dashboard")
  if (user?.role === "SELLER") redirect("/seller/dashboard")
  redirect("/")
}
