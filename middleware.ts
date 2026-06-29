import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher(["/account/:path*", "/cart", "/checkout/:path*"])
const isSellerRoute = createRouteMatcher(["/seller/:path*"])
const isAdminRoute = createRouteMatcher(["/admin/:path*"])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) || isSellerRoute(req) || isAdminRoute(req)) {
    await auth.protect()
  }
  // Role checks (seller, admin) are handled in each portal layout via DB lookup
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}
