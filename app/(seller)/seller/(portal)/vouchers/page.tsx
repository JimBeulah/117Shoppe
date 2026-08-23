import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/data/user"
import { getSellerVouchers } from "@/lib/seller/queries"
import { getShopAccess, canAccess } from "@/lib/seller/access"
import { createSellerVoucher, deactivateSellerVoucher, updateSellerVoucher } from "@/lib/seller/actions"
import { formatPrice } from "@/lib/utils"
import { SearchInput } from "@/components/ui/SearchInput"

export const metadata = { title: "My Vouchers" }

interface Props {
  searchParams: Promise<{ page?: string; search?: string; edit?: string }>
}

export default async function SellerVouchersPage({ searchParams }: Props) {
  const { page: pageStr, search, edit } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const searchQuery = search ?? null

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const access = await getShopAccess()
  if (!access) redirect("/seller/onboarding")
  if (!canAccess(access, "VOUCHERS")) redirect("/seller/dashboard")
  const shop = access.shop

  const { vouchers, total, pageSize } = await getSellerVouchers(shop.id, page, searchQuery)
  const totalPages = Math.ceil(total / pageSize)
  const editing = edit ? vouchers.find((v) => v.id === edit) : null

  function buildHref(overrides: { page?: number }) {
    const params = new URLSearchParams()
    const p = overrides.page ?? page
    const q = searchQuery
    if (q) params.set("search", q)
    if (p > 1) params.set("page", String(p))
    return `/seller/vouchers${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Vouchers</h1>
          <p className="text-xs text-text-secondary mt-0.5">Discount codes only usable on your shop&apos;s items.</p>
        </div>
        <SearchInput placeholder="Search vouchers by code or title..." />
      </div>

      <div className="bg-white rounded-lg border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-bg-page">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Code</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Discount</th>
              <th className="text-right px-4 py-3 text-text-secondary font-medium">Min Spend</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Expires</th>
              <th className="text-center px-4 py-3 text-text-secondary font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {vouchers.map((v) => (
              <tr key={v.id} className={`hover:bg-brand-50 transition-colors ${editing?.id === v.id ? "bg-brand-50" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-text-primary">{v.code}</td>
                <td className="px-4 py-3 text-text-primary">{v.title}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {v.discountType === "PERCENT" ? `${v.discountValue}%` : formatPrice(v.discountValue)}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">{formatPrice(v.minSpend)}</td>
                <td className="px-4 py-3 text-text-secondary">{new Date(v.expiresAt).toLocaleDateString("en-PH")}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {v.isActive ? "Active" : "Off"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={editing?.id === v.id ? buildHref({}) : `/seller/vouchers?edit=${v.id}${searchQuery ? `&search=${searchQuery}` : ""}${page > 1 ? `&page=${page}` : ""}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {editing?.id === v.id ? "Cancel" : "Edit"}
                    </Link>
                    {v.isActive && (
                      <form>
                        <input type="hidden" name="voucherId" value={v.id} />
                        <button
                          type="submit"
                          formAction={async (fd: FormData) => {
                            "use server"
                            await deactivateSellerVoucher(fd.get("voucherId") as string)
                          }}
                          className="text-xs text-red-500 hover:underline cursor-pointer"
                        >
                          Deactivate
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary text-sm">No vouchers yet.</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
            <p className="text-xs text-text-secondary">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={buildHref({ page: page - 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Previous</Link>}
              {page < totalPages && <Link href={buildHref({ page: page + 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">Next</Link>}
            </div>
          </div>
        )}
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="bg-white rounded-lg border border-brand-300 p-5">
          <h2 className="font-semibold text-sm text-text-primary mb-1">Edit Voucher — <span className="font-mono">{editing.code}</span></h2>
          <p className="text-xs text-text-secondary mb-4">Code cannot be changed after creation.</p>
          <form className="grid grid-cols-2 gap-3">
            <input type="hidden" name="voucherId" value={editing.id} />
            <div className="col-span-2">
              <label className="text-xs text-text-secondary block mb-1">Title *</label>
              <input name="title" required defaultValue={editing.title} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Discount Type *</label>
              <select name="discountType" defaultValue={editing.discountType} className="w-full text-sm border border-border-default rounded px-3 py-2 bg-white">
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed (₱)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Discount Value *</label>
              <input name="discountValue" type="number" step="0.01" required defaultValue={editing.discountValue} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Min Spend</label>
              <input name="minSpend" type="number" step="0.01" defaultValue={editing.minSpend} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Max Discount (optional)</label>
              <input name="maxDiscount" type="number" step="0.01" defaultValue={editing.maxDiscount ?? ""} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Expires At *</label>
              <input
                name="expiresAt"
                type="datetime-local"
                required
                defaultValue={new Date(editing.expiresAt).toISOString().slice(0, 16)}
                className="w-full text-sm border border-border-default rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Usage Limit (optional)</label>
              <input name="usageLimit" type="number" defaultValue={editing.usageLimit ?? ""} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input name="isActive" type="checkbox" defaultChecked={editing.isActive} className="rounded" />
                Active
              </label>
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  const maxDiscount = fd.get("maxDiscount") as string
                  const usageLimit = fd.get("usageLimit") as string
                  await updateSellerVoucher(fd.get("voucherId") as string, {
                    title: fd.get("title") as string,
                    discountType: fd.get("discountType") as "PERCENT" | "FIXED",
                    discountValue: parseFloat(fd.get("discountValue") as string),
                    minSpend: parseFloat(fd.get("minSpend") as string) || 0,
                    maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                    expiresAt: new Date(fd.get("expiresAt") as string),
                    usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
                    isActive: fd.get("isActive") === "on",
                  })
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
          <h2 className="font-semibold text-sm text-text-primary mb-4">Create Voucher</h2>
          <form className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Code *</label>
              <input name="code" required className="w-full text-sm border border-border-default rounded px-3 py-2 uppercase" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Title *</label>
              <input name="title" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Discount Type *</label>
              <select name="discountType" className="w-full text-sm border border-border-default rounded px-3 py-2 bg-white">
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed (₱)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Discount Value *</label>
              <input name="discountValue" type="number" step="0.01" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Min Spend</label>
              <input name="minSpend" type="number" step="0.01" defaultValue="0" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Max Discount (optional)</label>
              <input name="maxDiscount" type="number" step="0.01" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Expires At *</label>
              <input name="expiresAt" type="datetime-local" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Usage Limit (optional)</label>
              <input name="usageLimit" type="number" className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                formAction={async (fd: FormData) => {
                  "use server"
                  const maxDiscount = fd.get("maxDiscount") as string
                  const usageLimit = fd.get("usageLimit") as string
                  await createSellerVoucher({
                    code: (fd.get("code") as string).toUpperCase().trim(),
                    title: fd.get("title") as string,
                    discountType: fd.get("discountType") as "PERCENT" | "FIXED",
                    discountValue: parseFloat(fd.get("discountValue") as string),
                    minSpend: parseFloat(fd.get("minSpend") as string) || 0,
                    maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                    expiresAt: new Date(fd.get("expiresAt") as string),
                    usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
                    isActive: true,
                  })
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
              >
                Create Voucher
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
