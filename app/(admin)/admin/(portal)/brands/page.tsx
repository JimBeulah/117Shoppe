import Link from "next/link"
import Image from "next/image"
import { getAdminBrands } from "@/lib/admin/queries"
import { createBrand, updateBrand, deleteBrand } from "@/lib/admin/actions"
import ConfirmButton from "@/components/admin/ConfirmButton"

export const metadata = { title: "Admin — Brands" }

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const brands = await getAdminBrands()
  const editingBrand = edit ? brands.find((b) => b.id === edit) : null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Brands</h1>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Slug</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Logo</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Products</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3 font-medium text-text-primary">{brand.name}</td>
                <td className="px-4 py-3 text-text-secondary font-mono text-xs">{brand.slug}</td>
                <td className="px-4 py-3">
                  {brand.logoUrl ? (
                    <Image src={brand.logoUrl} alt="" width={32} height={32} unoptimized className="w-8 h-8 rounded-full object-cover border border-border-default" />
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">{brand._count.products}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/brands?edit=${brand.id}`} className="text-xs text-brand-600 hover:underline">
                      Edit
                    </Link>
                    <form>
                      <ConfirmButton
                        message="Delete this brand?"
                        className="text-xs text-red-500 hover:underline"
                        formAction={async (fd: FormData) => {
                          "use server"
                          await deleteBrand(brand.id)
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
      {editingBrand && (
        <div className="bg-white rounded-lg border border-border-default p-5">
          <h2 className="font-semibold text-sm text-text-primary mb-4">Edit Brand</h2>
          <form className="grid grid-cols-2 gap-3">
            <input type="hidden" name="brandId" value={editingBrand.id} />
            <div>
              <label className="text-xs text-text-secondary block mb-1">Name *</label>
              <input
                name="name"
                required
                defaultValue={editingBrand.name}
                className="w-full text-sm border border-border-default rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Slug *</label>
              <input
                name="slug"
                required
                defaultValue={editingBrand.slug}
                className="w-full text-sm border border-border-default rounded px-3 py-2"
                placeholder="lowercase-with-hyphens"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-text-secondary block mb-1">Logo URL</label>
              <input
                name="logoUrl"
                defaultValue={editingBrand.logoUrl ?? ""}
                placeholder="https://..."
                className="w-full text-sm border border-border-default rounded px-3 py-2"
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  await updateBrand(
                    fd.get("brandId") as string,
                    fd.get("name") as string,
                    fd.get("slug") as string,
                    (fd.get("logoUrl") as string) || null
                  )
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
              >
                Save Changes
              </button>
              <Link href="/admin/brands" className="text-sm text-text-secondary hover:underline">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}

      {/* Create Form */}
      <div className="bg-white rounded-lg border border-border-default p-5">
        <h2 className="font-semibold text-sm text-text-primary mb-4">Add Brand</h2>
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
          <div className="col-span-2">
            <label className="text-xs text-text-secondary block mb-1">Logo URL</label>
            <input name="logoUrl" placeholder="https://..." className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              formAction={async (fd: FormData) => {
                "use server"
                await createBrand(
                  fd.get("name") as string,
                  fd.get("slug") as string,
                  (fd.get("logoUrl") as string) || null
                )
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
            >
              Create Brand
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
