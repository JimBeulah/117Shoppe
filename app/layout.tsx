import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "11/7 Shoppe", template: "%s | 11/7 Shoppe" },
  description: "Shop millions of products at the best prices on 11/7 Shoppe.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-page">
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
