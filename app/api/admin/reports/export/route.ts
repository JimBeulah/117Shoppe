import { NextResponse } from "next/server"
import { assertAdmin } from "@/lib/admin/actions"
import {
  getSalesReport,
  getCustomerReport,
  getProductReport,
  getStoreComparisonReport,
  getConversionReport,
  buildDailySalesCsv,
  buildTopProductsCsv,
  buildCustomersCsv,
  buildProductReportCsv,
  buildStoreComparisonCsv,
  buildConversionCsv,
} from "@/lib/admin/reports"
import { resolveDateRange } from "@/lib/reports/dates"

export async function GET(req: Request) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const typeParam = searchParams.get("type")
  const VALID_TYPES = ["products", "customers", "product-detail", "stores", "conversion", "daily"] as const
  const type = (VALID_TYPES as readonly string[]).includes(typeParam ?? "")
    ? (typeParam as (typeof VALID_TYPES)[number])
    : "daily"

  const { from, to } = resolveDateRange(searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined)

  let csv: string
  if (type === "customers") {
    const report = await getCustomerReport(from, to)
    csv = buildCustomersCsv(report.topCustomers)
  } else if (type === "product-detail") {
    csv = buildProductReportCsv(await getProductReport(from, to))
  } else if (type === "stores") {
    csv = buildStoreComparisonCsv(await getStoreComparisonReport(from, to))
  } else if (type === "conversion") {
    csv = buildConversionCsv((await getConversionReport(from, to)).topProducts)
  } else {
    const report = await getSalesReport(from, to)
    csv = type === "products" ? buildTopProductsCsv(report.topProducts) : buildDailySalesCsv(report.daily)
  }

  const filenames: Record<string, string> = {
    products: "top-products",
    customers: "customers",
    "product-detail": "product-report",
    stores: "store-comparison",
    conversion: "conversion",
    daily: "daily-sales",
  }
  const filename = `${filenames[type]}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
