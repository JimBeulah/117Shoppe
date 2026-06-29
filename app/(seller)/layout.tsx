import { Toaster } from "sonner"

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-page">
      {children}
      <Toaster position="top-right" richColors />
    </div>
  )
}
