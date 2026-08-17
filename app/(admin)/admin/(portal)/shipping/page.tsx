import Link from "next/link"
import {
  getAdminShippingMethods,
  getAdminShippingZones,
  getAdminShippingRates,
} from "@/lib/admin/queries"
import {
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
} from "@/lib/admin/actions"
import { fetchProvinces } from "@/lib/psgc"
import ConfirmButton from "@/components/admin/ConfirmButton"
import { ShippingRateMatrix } from "@/components/admin/ShippingRateMatrix"

export const metadata = { title: "Admin — Shipping" }

export default async function AdminShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ editMethod?: string; editZone?: string }>
}) {
  const { editMethod, editZone } = await searchParams
  const [methods, zones, rates, provinces] = await Promise.all([
    getAdminShippingMethods(),
    getAdminShippingZones(),
    getAdminShippingRates(),
    fetchProvinces(),
  ])
  const editingMethod = editMethod ? methods.find((m) => m.id === editMethod) : null
  const editingZone = editZone ? zones.find((z) => z.id === editZone) : null

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-text-primary">Shipping</h1>

      {/* ─── Methods ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-text-primary">Shipping Methods</h2>
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Carrier</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {methods.map((method) => (
                <tr key={method.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{method.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{method.carrier}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        method.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {method.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/shipping?editMethod=${method.id}`} className="text-xs text-brand-600 hover:underline">
                        Edit
                      </Link>
                      <form>
                        <ConfirmButton
                          message="Delete this shipping method?"
                          className="text-xs text-red-500 hover:underline"
                          formAction={async () => {
                            "use server"
                            await deleteShippingMethod(method.id)
                          }}
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {methods.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                    No shipping methods yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingMethod && (
          <div className="bg-white rounded-lg border border-border-default p-5">
            <h3 className="font-semibold text-sm text-text-primary mb-4">Edit Method</h3>
            <form className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Name *</label>
                <input name="name" required defaultValue={editingMethod.name} className="w-full text-sm border border-border-default rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Carrier *</label>
                <input name="carrier" required defaultValue={editingMethod.carrier} className="w-full text-sm border border-border-default rounded px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-text-secondary block mb-1">Description</label>
                <input name="description" defaultValue={editingMethod.description ?? ""} className="w-full text-sm border border-border-default rounded px-3 py-2" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" name="isActive" id="method-active" defaultChecked={editingMethod.isActive} />
                <label htmlFor="method-active" className="text-sm text-text-primary">Active</label>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  formAction={async (fd: FormData) => {
                    "use server"
                    await updateShippingMethod(
                      editingMethod.id,
                      fd.get("name") as string,
                      fd.get("carrier") as string,
                      (fd.get("description") as string) || null,
                      fd.get("isActive") === "on"
                    )
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
                >
                  Save Changes
                </button>
                <Link href="/admin/shipping" className="text-sm text-text-secondary hover:underline">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg border border-border-default p-5">
          <h3 className="font-semibold text-sm text-text-primary mb-4">Add Method</h3>
          <form className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Name *</label>
              <input name="name" required placeholder="e.g. Standard" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Carrier *</label>
              <input name="carrier" required placeholder="e.g. LBC" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-text-secondary block mb-1">Description</label>
              <input name="description" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  await createShippingMethod(
                    fd.get("name") as string,
                    fd.get("carrier") as string,
                    (fd.get("description") as string) || null
                  )
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
              >
                Create Method
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ─── Zones ───────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-text-primary">Shipping Zones</h2>
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Provinces</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary align-top">{zone.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{zone.provinces.join(", ")}</td>
                  <td className="px-4 py-3 text-right align-top">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/shipping?editZone=${zone.id}`} className="text-xs text-brand-600 hover:underline">
                        Edit
                      </Link>
                      <form>
                        <ConfirmButton
                          message="Delete this zone? Its rates will also be removed."
                          className="text-xs text-red-500 hover:underline"
                          formAction={async () => {
                            "use server"
                            await deleteShippingZone(zone.id)
                          }}
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {zones.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-text-secondary">
                    No shipping zones yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingZone && (
          <div className="bg-white rounded-lg border border-border-default p-5">
            <h3 className="font-semibold text-sm text-text-primary mb-4">Edit Zone</h3>
            <form className="space-y-3">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Name *</label>
                <input name="name" required defaultValue={editingZone.name} className="w-full text-sm border border-border-default rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Provinces * (ctrl/cmd-click to select multiple)</label>
                <select name="provinces" multiple required defaultValue={editingZone.provinces} size={8} className="w-full text-sm border border-border-default rounded px-3 py-2">
                  {provinces.map((p) => (
                    <option key={p.code} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  formAction={async (fd: FormData) => {
                    "use server"
                    await updateShippingZone(editingZone.id, fd.get("name") as string, fd.getAll("provinces") as string[])
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
                >
                  Save Changes
                </button>
                <Link href="/admin/shipping" className="text-sm text-text-secondary hover:underline">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg border border-border-default p-5">
          <h3 className="font-semibold text-sm text-text-primary mb-4">Add Zone</h3>
          <form className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Name *</label>
              <input name="name" required placeholder="e.g. Metro Manila" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Provinces * (ctrl/cmd-click to select multiple)</label>
              <select name="provinces" multiple required size={8} className="w-full text-sm border border-border-default rounded px-3 py-2">
                {provinces.map((p) => (
                  <option key={p.code} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                await createShippingZone(fd.get("name") as string, fd.getAll("provinces") as string[])
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
            >
              Create Zone
            </button>
          </form>
        </div>
      </section>

      {/* ─── Rate Matrix ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-text-primary">Rate Matrix</h2>
        <ShippingRateMatrix methods={methods} zones={zones} rates={rates} />
      </section>
    </div>
  )
}
