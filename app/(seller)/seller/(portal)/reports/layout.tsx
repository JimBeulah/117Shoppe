import { ReportTabs } from "@/components/reports/ReportTabs"

const TABS = [
  { slug: "", label: "Sales" },
  { slug: "customers", label: "Customers" },
  { slug: "products", label: "Products" },
  { slug: "stores", label: "Stores" },
  { slug: "conversion", label: "Conversion" },
]

export default function SellerReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <ReportTabs basePath="/seller/reports" tabs={TABS} />
      {children}
    </div>
  )
}
