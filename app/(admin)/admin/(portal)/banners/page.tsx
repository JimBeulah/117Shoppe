import Link from "next/link"
import { getAdminBanners } from "@/lib/admin/queries"
import { createBanner, toggleBanner, deleteBanner, updateBanner } from "@/lib/admin/actions"
import ConfirmButton from "@/components/admin/ConfirmButton"

export const metadata = { title: "Admin — Banners" }

interface Props {
  searchParams: Promise<{ edit?: string }>
}

export default async function AdminBannersPage({ searchParams }: Props) {
  const { edit } = await searchParams
  const banners = await getAdminBanners()
  const editing = edit ? banners.find((b) => b.id === edit) : null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Banners</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Preview</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Link</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Order</th>
              <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {banners.map((banner) => (
              <tr key={banner.id} className={`hover:bg-brand-50 transition-colors ${editing?.id === banner.id ? "bg-brand-50" : ""}`}>
                <td className="px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.imageUrl} alt={banner.title ?? ""} className="h-12 w-20 object-cover rounded border border-border-default" />
                </td>
                <td className="px-4 py-3 text-text-primary">{banner.title ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[160px]">{banner.linkUrl ?? "—"}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{banner.displayOrder}</td>
                <td className="px-4 py-3 text-center">
                  <form>
                    <input type="hidden" name="bannerId" value={banner.id} />
                    <input type="hidden" name="isActive" value={String(!banner.isActive)} />
                    <button
                      type="submit"
                      formAction={async (fd: FormData) => {
                        "use server"
                        await toggleBanner(fd.get("bannerId") as string, fd.get("isActive") === "true")
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${banner.isActive ? "bg-brand-600" : "bg-gray-200"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${banner.isActive ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(banner.createdAt).toLocaleDateString("en-PH")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={editing?.id === banner.id ? "/admin/banners" : `/admin/banners?edit=${banner.id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {editing?.id === banner.id ? "Cancel" : "Edit"}
                    </Link>
                    <form>
                      <ConfirmButton
                        message="Delete banner?"
                        className="text-xs text-red-500 hover:underline"
                        formAction={async () => {
                          "use server"
                          await deleteBanner(banner.id)
                        }}
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary text-sm">No banners yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="bg-white rounded-lg border border-brand-300 p-5">
          <h2 className="font-semibold text-sm text-text-primary mb-4">Edit Banner</h2>
          <form className="grid grid-cols-2 gap-3">
            <input type="hidden" name="bannerId" value={editing.id} />
            <div className="col-span-2">
              <label className="text-xs text-text-secondary block mb-1">Image URL *</label>
              <input name="imageUrl" required defaultValue={editing.imageUrl} className="w-full text-sm border border-border-default rounded px-3 py-2" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Title</label>
              <input name="title" defaultValue={editing.title ?? ""} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Link URL</label>
              <input name="linkUrl" defaultValue={editing.linkUrl ?? ""} className="w-full text-sm border border-border-default rounded px-3 py-2" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Display Order</label>
              <input name="displayOrder" type="number" defaultValue={editing.displayOrder} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  await updateBanner(
                    fd.get("bannerId") as string,
                    fd.get("imageUrl") as string,
                    (fd.get("title") as string) || null,
                    (fd.get("linkUrl") as string) || null,
                    parseInt(fd.get("displayOrder") as string, 10) || 0,
                  )
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Form */}
      {!editing && (
        <div className="bg-white rounded-lg border border-border-default p-5">
          <h2 className="font-semibold text-sm text-text-primary mb-4">Add Banner</h2>
          <form className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-text-secondary block mb-1">Image URL *</label>
              <input name="imageUrl" required className="w-full text-sm border border-border-default rounded px-3 py-2" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Title</label>
              <input name="title" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Link URL</label>
              <input name="linkUrl" className="w-full text-sm border border-border-default rounded px-3 py-2" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Display Order</label>
              <input name="displayOrder" type="number" defaultValue="0" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input name="isActive" type="checkbox" defaultChecked className="rounded" />
                Active
              </label>
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  await createBanner(
                    fd.get("imageUrl") as string,
                    (fd.get("title") as string) || null,
                    (fd.get("linkUrl") as string) || null,
                    parseInt(fd.get("displayOrder") as string, 10) || 0,
                    fd.get("isActive") === "on"
                  )
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
              >
                Add Banner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
