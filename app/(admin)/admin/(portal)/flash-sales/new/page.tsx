import { redirect } from "next/navigation"
import { createFlashSale } from "@/lib/admin/actions"

export const metadata = { title: "Admin — New Flash Sale" }

export default function AdminNewFlashSalePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-text-primary">New Flash Sale</h1>

      <div className="bg-white rounded-lg border border-border-default p-5">
        <form className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Title *</label>
            <input name="title" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Starts At *</label>
              <input name="startsAt" type="datetime-local" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Ends At *</label>
              <input name="endsAt" type="datetime-local" required className="w-full text-sm border border-border-default rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="isActive" type="checkbox" id="isActive" defaultChecked />
            <label htmlFor="isActive" className="text-sm text-text-primary">Active</label>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">
              Products — one per line: <code className="bg-gray-100 px-1 rounded">productId,salePrice,stock</code>
            </label>
            <textarea
              name="itemsRaw"
              rows={6}
              placeholder={"cm123abc,499,50\ncm456def,299,100"}
              className="w-full text-sm border border-border-default rounded px-3 py-2 font-mono"
            />
          </div>
          <button
            type="submit"
            formAction={async (fd: FormData) => {
              "use server"
              const itemsRaw = (fd.get("itemsRaw") as string)
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line) => {
                  const [productId, salePrice, stock] = line.split(",")
                  return { productId: productId.trim(), salePrice: parseFloat(salePrice), stock: parseInt(stock, 10) }
                })
                .filter((i: { productId: string; salePrice: number; stock: number }) => i.productId && !isNaN(i.salePrice) && !isNaN(i.stock))

              const result = await createFlashSale(
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
            Create Flash Sale
          </button>
        </form>
      </div>
    </div>
  )
}
