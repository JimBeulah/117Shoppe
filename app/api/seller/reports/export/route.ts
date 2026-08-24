import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/data/user"
import { getShopAccess, canAccess } from "@/lib/seller/access"
import { getSellerSalesReport, buildDailySalesCsv, buildTopProductsCsv } from "@/lib/seller/reports"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const access = await getShopAccess()
  if (!access) return NextResponse.json({ error: "No shop" }, { status: 403 })
  if (!canAccess(access, "REPORTS")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") === "products" ? "products" : "daily"

  const defaultTo = new Date()
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 29)

  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const from = fromStr ? new Date(fromStr) : defaultFrom
  const to = toStr ? new Date(toStr) : defaultTo
  to.setHours(23, 59, 59, 999)

  const report = await getSellerSalesReport(access.shop.id, from, to)
  const csv = type === "products" ? buildTopProductsCsv(report.topProducts) : buildDailySalesCsv(report.daily)
  const filename = `${type === "products" ? "top-products" : "daily-sales"}-${access.shop.id}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
