import { Suspense } from "react"
import { Toaster } from "sonner"
import { Navbar } from "@/components/layout/Navbar"
import { CartBadge } from "@/components/layout/CartBadge"
import { Footer } from "@/components/layout/Footer"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar
        cartBadge={
          <Suspense fallback={<span>0</span>}>
            <CartBadge />
          </Suspense>
        }
      />
      <main className="flex-1 min-h-screen">{children}</main>
      <Footer />
      <Toaster position="top-right" richColors />
    </>
  )
}
