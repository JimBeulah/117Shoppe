import Link from "next/link"
import { getAdminUsers } from "@/lib/admin/queries"
import { promoteToSeller, demoteToBuyer } from "@/lib/admin/actions"

export const metadata = { title: "Admin — Users" }

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  SELLER: "bg-blue-100 text-blue-700",
  BUYER: "bg-gray-100 text-gray-600",
}

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))

  const { users, total, pageSize } = await getAdminUsers(page)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Users</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Email</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Role</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
                <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ROLE_COLOR[user.role] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(user.createdAt).toLocaleDateString("en-PH")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/orders?userId=${user.id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Orders
                    </Link>
                    {user.role === "BUYER" && (
                      <form>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="clerkId" value={user.clerkId} />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await promoteToSeller(
                              fd.get("userId") as string,
                              fd.get("clerkId") as string
                            )
                          }}
                          className="text-xs px-2 py-1 border border-brand-600 text-brand-600 rounded hover:bg-brand-50"
                        >
                          Promote to Seller
                        </button>
                      </form>
                    )}
                    {user.role === "SELLER" && (
                      <form>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="clerkId" value={user.clerkId} />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await demoteToBuyer(
                              fd.get("userId") as string,
                              fd.get("clerkId") as string
                            )
                          }}
                          className="text-xs px-2 py-1 border border-red-500 text-red-500 rounded hover:bg-red-50"
                        >
                          Demote to Buyer
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
            <p className="text-xs text-text-secondary">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/users?page=${page - 1}`}
                  className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/users?page=${page + 1}`}
                  className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
