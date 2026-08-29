import { Suspense } from "react"
import { Toaster } from "sonner"
import { Navbar } from "@/components/layout/Navbar"
import { CartBadge } from "@/components/layout/CartBadge"
import { Footer } from "@/components/layout/Footer"
import { MobileTabBar } from "@/components/layout/MobileTabBar"
import { WishlistProvider } from "@/components/wishlist/WishlistProvider"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <WishlistProvider>
      <Navbar
        cartBadge={
          <Suspense fallback={<span>0</span>}>
            <CartBadge />
          </Suspense>
        }
      />
      <main className="flex-1 min-h-screen pb-14 md:pb-0">{children}</main>
      <Footer />
      <MobileTabBar />
      <Toaster position="top-right" richColors />
    </WishlistProvider>
  )
}
