import Link from "next/link"
import { getAdminCategories } from "@/lib/admin/queries"
import { createCategory, updateCategory, deleteCategory } from "@/lib/admin/actions"
import ConfirmButton from "@/components/admin/ConfirmButton"

export const metadata = { title: "Admin — Categories" }

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const categories = await getAdminCategories()
  const parents = categories.filter((c) => !c.parentId)
  const editingCategory = edit ? categories.find((c) => c.id === edit) : null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Categories</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Slug</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Parent</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Image</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Products</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">
                  {cat.parentId ? <span className="ml-4">{cat.name}</span> : cat.name}
                </td>
                <td className="px-4 py-3 text-text-secondary font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3 text-text-secondary">{cat.parent?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-border-default" />
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">{cat._count.products}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/categories?edit=${cat.id}`} className="text-xs text-brand-600 hover:underline">
                      Edit
                    </Link>
                    <form>
                      <ConfirmButton
                        message="Delete this category?"
                        className="text-xs text-red-500 hover:underline"
                        formAction={async (fd: FormData) => {
                          "use server"
                          await deleteCategory(cat.id)
                        }}
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Form */}
      {editingCategory && (
        <div className="bg-white rounded-lg border border-border-default p-5">
          <h2 className="font-semibold text-sm text-text-primary mb-4">Edit Category</h2>
          <form className="grid grid-cols-2 gap-3">
            <input type="hidden" name="categoryId" value={editingCategory.id} />
            <div>
              <label className="text-xs text-text-secondary block mb-1">Name *</label>
              <input
                name="name"
                required
                defaultValue={editingCategory.name}
                className="w-full text-sm border border-border-default rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Slug *</label>
              <input
                name="slug"
                required
                defaultValue={editingCategory.slug}
                className="w-full text-sm border border-border-default rounded px-3 py-2"
                placeholder="lowercase-with-hyphens"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Image URL</label>
              <input
                name="imageUrl"
                defaultValue={editingCategory.imageUrl ?? ""}
                placeholder="https://..."
                className="w-full text-sm border border-border-default rounded px-3 py-2"
              />
            </div>
            <input type="hidden" name="icon" value={editingCategory.icon ?? ""} />
            <div>
              <label className="text-xs text-text-secondary block mb-1">Parent Category</label>
              <select
                name="parentId"
                defaultValue={editingCategory.parentId ?? ""}
                className="w-full text-sm border border-border-default rounded px-3 py-2 bg-white"
              >
                <option value="">None</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  await updateCategory(
                    fd.get("categoryId") as string,
                    fd.get("name") as string,
                    fd.get("slug") as string,
                    (fd.get("icon") as string) || null,
                    (fd.get("imageUrl") as string) || null,
                    (fd.get("parentId") as string) || null
                  )
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
              >
                Save Changes
              </button>
              <Link href="/admin/categories" className="text-sm text-text-secondary hover:underline">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}

      {/* Create Form */}
      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-4">Add Category</h2>
        <form className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Name *</label>
            <input name="name" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Slug *</label>
            <input
              name="slug"
              required
              className="w-full text-sm border border-border-default rounded px-3 py-2"
              placeholder="lowercase-with-hyphens"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Image URL</label>
            <input name="imageUrl" placeholder="https://..." className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Parent Category</label>
            <select
              name="parentId"
              className="w-full text-sm border border-border-default rounded px-3 py-2 bg-white"
            >
              <option value="">None</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                await createCategory(
                  fd.get("name") as string,
                  fd.get("slug") as string,
                  null,
                  (fd.get("imageUrl") as string) || null,
                  (fd.get("parentId") as string) || null
                )
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
