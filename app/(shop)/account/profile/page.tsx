import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/data/user"
import { updateProfileName } from "./actions"

export const metadata = { title: "My Profile" }

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await getCurrentUser()
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-text-secondary">
        Setting up your account… refresh in a moment.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover border border-border-default"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-2xl">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <p className="text-sm text-text-secondary">
          Change your avatar via the account menu in the top navigation.
        </p>
      </div>

      {/* Name */}
      <form action={updateProfileName} className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-text-primary">
          Display Name
        </label>
        <div className="flex gap-3">
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={user.name}
            maxLength={100}
            className="flex-1 border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Save
          </button>
        </div>
      </form>

      {/* Read-only fields */}
      <dl className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-text-secondary">Email</dt>
          <dd className="mt-1 text-sm text-text-primary">{user.email}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-text-secondary">Role</dt>
          <dd className="mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
              {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-text-secondary">Member since</dt>
          <dd className="mt-1 text-sm text-text-primary">
            {new Date(user.createdAt).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </dd>
        </div>
      </dl>
    </div>
  )
}
