import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher(["/account/:path*", "/cart", "/checkout/:path*"])
const isSellerRoute = createRouteMatcher(["/seller/:path*"])
const isOpenSellerRoute = createRouteMatcher([
  "/seller/onboarding",
  "/seller/pending",
  "/seller/rejected",
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) || isSellerRoute(req)) {
    await auth.protect()
  }

  if (isSellerRoute(req) && !isOpenSellerRoute(req)) {
    const { sessionClaims } = await auth()
    if (sessionClaims?.metadata?.role !== "SELLER") {
      return Response.redirect(new URL("/seller/onboarding", req.url))
    }
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}
