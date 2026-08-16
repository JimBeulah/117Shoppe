"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { addStaffMember, updateStaffPermissions, removeStaffMember } from "@/lib/seller/actions"
import type { StaffMember, StaffPermissionValue } from "@/types/seller"

const PERMISSION_OPTIONS: { value: StaffPermissionValue; label: string }[] = [
  { value: "PRODUCTS", label: "Products" },
  { value: "ORDERS", label: "Orders" },
  { value: "REVIEWS", label: "Reviews" },
  { value: "CHAT", label: "Messages" },
]

interface Props {
  initialStaff: StaffMember[]
}

export default function StaffManager({ initialStaff }: Props) {
  const [staff, setStaff] = useState(initialStaff)
  const [email, setEmail] = useState("")
  const [newPermissions, setNewPermissions] = useState<StaffPermissionValue[]>([])
  const [isPending, startTransition] = useTransition()

  function toggleNewPermission(perm: StaffPermissionValue) {
    setNewPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Email is required")
      return
    }
    if (newPermissions.length === 0) {
      toast.error("Select at least one permission")
      return
    }

    startTransition(async () => {
      const result = await addStaffMember(email, newPermissions)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Staff member added")
      setEmail("")
      setNewPermissions([])
      window.location.reload()
    })
  }

  function handleTogglePermission(staffId: string, perm: StaffPermissionValue) {
    const member = staff.find((s) => s.id === staffId)
    if (!member) return
    const next = member.permissions.includes(perm)
      ? member.permissions.filter((p) => p !== perm)
      : [...member.permissions, perm]

    if (next.length === 0) {
      toast.error("A staff member needs at least one permission")
      return
    }

    startTransition(async () => {
      const result = await updateStaffPermissions(staffId, next)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setStaff((prev) => prev.map((s) => (s.id === staffId ? { ...s, permissions: next } : s)))
      toast.success("Permissions updated")
    })
  }

  function handleRemove(staffId: string, name: string) {
    const ok = confirm(`Remove ${name} as staff? They'll lose access to the seller portal immediately.`)
    if (!ok) return

    startTransition(async () => {
      const result = await removeStaffMember(staffId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setStaff((prev) => prev.filter((s) => s.id !== staffId))
      toast.success("Staff member removed")
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white rounded-lg border border-border-default p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Add Staff Member</h2>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.com"
            className="w-full max-w-sm border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-text-secondary">Must be an email already registered on the site.</p>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Permissions</label>
          <div className="flex flex-wrap gap-3">
            {PERMISSION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={newPermissions.includes(opt.value)}
                  onChange={() => toggleNewPermission(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50"
        >
          Add Staff Member
        </button>
      </form>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <h2 className="text-sm font-semibold text-text-primary px-4 py-3 border-b border-border-default">
          Current Staff
        </h2>
        {staff.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">No staff members yet.</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {staff.map((member) => (
              <li key={member.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{member.user.name}</p>
                    <p className="text-xs text-text-secondary truncate">{member.user.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(member.id, member.user.name)}
                    className="text-xs font-medium text-red-600 hover:underline shrink-0 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {PERMISSION_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        disabled={isPending}
                        checked={member.permissions.includes(opt.value)}
                        onChange={() => handleTogglePermission(member.id, opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
