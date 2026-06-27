import { getAdminCategories } from "@/lib/admin/queries"
import { createCategory, deleteCategory } from "@/lib/admin/actions"

export const metadata = { title: "Admin — Categories" }

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories()
  const parents = categories.filter((c) => !c.parentId)

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
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Icon</th>
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
                <td className="px-4 py-3 text-text-secondary">{cat.icon ?? "—"}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{cat._count.products}</td>
                <td className="px-4 py-3 text-right">
                  <form>
                    <input type="hidden" name="categoryId" value={cat.id} />
                    <button
                      type="submit"
                      formAction={async (fd: FormData) => {
                        "use server"
                        await deleteCategory(fd.get("categoryId") as string)
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            <label className="text-xs text-text-secondary block mb-1">Icon (emoji or URL)</label>
            <input name="icon" className="w-full text-sm border border-border-default rounded px-3 py-2" />
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
                  (fd.get("icon") as string) || null,
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
