import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getAdminFlashSaleForEdit } from "@/lib/admin/queries"
import { updateFlashSale } from "@/lib/admin/actions"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditFlashSalePage({ params }: Props) {
  const { id } = await params
  const fs = await getAdminFlashSaleForEdit(id)
  if (!fs) notFound()

  // Format for datetime-local input: "YYYY-MM-DDTHH:MM"
  const toInputValue = (d: Date) => new Date(d).toISOString().slice(0, 16)

  const existingItemsText = fs.items
    .map((i) => `${i.productId},${i.salePrice},${i.stock}`)
    .join("\n")

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Edit Flash Sale</h1>
        <Link href="/admin/flash-sales" className="text-sm text-brand-600 hover:underline">← Back</Link>
      </div>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <form className="space-y-4">
          <input type="hidden" name="flashSaleId" value={fs.id} />
          <div>
            <label className="text-xs text-text-secondary block mb-1">Title *</label>
            <input name="title" required defaultValue={fs.title} className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Starts At *</label>
              <input name="startsAt" type="datetime-local" required defaultValue={toInputValue(fs.startsAt)} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Ends At *</label>
              <input name="endsAt" type="datetime-local" required defaultValue={toInputValue(fs.endsAt)} className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="isActive" type="checkbox" id="isActive" defaultChecked={fs.isActive} />
            <label htmlFor="isActive" className="text-sm text-text-primary">Active</label>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Products — one per line: <code className="bg-gray-100 px-1 rounded">productId,salePrice,stock</code>
            </label>
            <p className="text-xs text-text-secondary mb-1">Saving replaces all current items.</p>
            <textarea
              name="itemsRaw"
              rows={8}
              defaultValue={existingItemsText}
              className="w-full text-sm border border-border-default rounded px-3 py-2 font-mono"
            />
          </div>

          {/* Current items preview */}
          {fs.items.length > 0 && (
            <div className="text-xs text-text-secondary space-y-1">
              <p className="font-medium text-text-primary">Current items:</p>
              {fs.items.map((i) => (
                <p key={i.id}>{i.product.name} — Sale: ₱{i.salePrice} · Stock: {i.stock}</p>
              ))}
            </div>
          )}

          <button
            type="submit"
            formAction={async (fd: FormData) => {
              "use server"
              const fsId = fd.get("flashSaleId") as string
              const itemsRaw = (fd.get("itemsRaw") as string)
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line) => {
                  const [productId, salePrice, stock] = line.split(",")
                  return { productId: productId.trim(), salePrice: parseFloat(salePrice), stock: parseInt(stock, 10) }
                })
                .filter((i: { productId: string; salePrice: number; stock: number }) => i.productId && !isNaN(i.salePrice) && !isNaN(i.stock))

              const result = await updateFlashSale(
                fsId,
                fd.get("title") as string,
                new Date(fd.get("startsAt") as string),
                new Date(fd.get("endsAt") as string),
                fd.get("isActive") === "on",
                itemsRaw
              )
              if (!result.error) redirect("/admin/flash-sales")
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
