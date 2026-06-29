# Seller Shop Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/seller/settings` page where sellers can update their shop name, logo, and banner (slug is read-only).

**Architecture:** Three-task sequence: (1) install Sonner and wire up `<Toaster>` in the seller layout, (2) add `updateShop` server action to the existing actions file, (3) build the settings form component, page, and sidebar link. All follow existing seller portal patterns (Client Component form + `useTransition` + server action).

**Tech Stack:** Next.js App Router, Prisma, UploadThing (`shopLogo` / `shopBanner` endpoints), Sonner (new), Tailwind CSS

## Global Constraints

- TypeScript strict mode — no `any`
- Tailwind only — no inline styles
- Token names: `bg-bg-page`, `text-text-primary`, `text-text-secondary`, `border-border-default`, `bg-brand-600`, `hover:bg-brand-700`, `brand-50`, `brand-500`
- Server actions start with `"use server"`; Client Components start with `"use client"`
- No new dependencies except `sonner`
- Follow existing seller portal pattern: `getVerifiedShop()` for auth in actions

---

### Task 1: Install Sonner and wire up `<Toaster>` in seller layout

**Files:**
- Modify: `app/(seller)/layout.tsx`

**Interfaces:**
- Produces: `<Toaster />` available to all pages under `app/(seller)/`

- [ ] **Step 1: Install sonner**

```bash
npm install sonner
```

Expected output includes: `added 1 package` (or similar — no errors).

- [ ] **Step 2: Update `app/(seller)/layout.tsx`**

Replace the entire file with:

```tsx
import { Toaster } from "sonner"

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-page">
      {children}
      <Toaster position="top-right" richColors />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(seller)/layout.tsx package.json package-lock.json
git commit -m "feat(seller): install sonner and add Toaster to seller layout"
```

---

### Task 2: Add `updateShop` server action

**Files:**
- Modify: `lib/seller/actions.ts`

**Interfaces:**
- Consumes: `getVerifiedShop()` already defined at top of `lib/seller/actions.ts`
- Produces: `updateShop(formData: FormData): Promise<{ error?: string }>`

- [ ] **Step 1: Append `updateShop` to `lib/seller/actions.ts`**

Add this block after the `createShop` function and before the `// ─── Products ───` comment:

```ts
export async function updateShop(formData: FormData): Promise<{ error?: string }> {
  const shop = await getVerifiedShop()
  if (!shop) return { error: "Unauthorized" }

  const name = (formData.get("name") as string)?.trim()
  const logo = (formData.get("logo") as string) || null
  const banner = (formData.get("banner") as string) || null

  if (!name) return { error: "Shop name is required" }

  try {
    await prisma.shop.update({
      where: { id: shop.id },
      data: { name, logo, banner },
    })
  } catch {
    return { error: "Failed to update shop. Please try again." }
  }

  revalidatePath("/seller/settings")
  revalidatePath(`/shop/${shop.slug}`)
  return {}
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/seller/actions.ts
git commit -m "feat(seller): add updateShop server action"
```

---

### Task 3: Settings form component, page, and sidebar link

**Files:**
- Create: `components/seller/ShopSettingsForm.tsx`
- Create: `app/(seller)/seller/(portal)/settings/page.tsx`
- Modify: `components/seller/SellerSidebar.tsx`

**Interfaces:**
- Consumes: `updateShop` from `@/lib/seller/actions`
- Consumes: `ProductImageUploader` from `@/components/seller/ProductImageUploader`
- Consumes: `getCurrentShop` from `@/lib/seller/queries`
- Consumes: `toast` from `sonner`

Props for `ShopSettingsForm`:
```ts
{
  initialName: string
  initialLogo: string | null
  initialBanner: string | null
  slug: string
}
```

- [ ] **Step 1: Create `components/seller/ShopSettingsForm.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import ProductImageUploader from "@/components/seller/ProductImageUploader"
import { updateShop } from "@/lib/seller/actions"

interface Props {
  initialName: string
  initialLogo: string | null
  initialBanner: string | null
  slug: string
}

export default function ShopSettingsForm({ initialName, initialLogo, initialBanner, slug }: Props) {
  const [name, setName] = useState(initialName)
  const [logo, setLogo] = useState<string[]>(initialLogo ? [initialLogo] : [])
  const [banner, setBanner] = useState<string[]>(initialBanner ? [initialBanner] : [])
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.set("name", name)
    if (logo[0]) formData.set("logo", logo[0])
    if (banner[0]) formData.set("banner", banner[0])

    startTransition(async () => {
      const result = await updateShop(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Shop updated!")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Shop Name */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={60}
          placeholder="My Awesome Shop"
          className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Shop URL (read-only) */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop URL</label>
        <div className="flex items-center gap-1 px-3 py-2 border border-border-default rounded bg-bg-page text-sm text-text-secondary">
          eshopee.com/shop/{slug}
        </div>
        <p className="text-xs text-text-secondary">Shop URL cannot be changed.</p>
      </div>

      {/* Logo */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop Logo</label>
        <ProductImageUploader
          endpoint="shopLogo"
          value={logo}
          onChange={setLogo}
          maxFiles={1}
          label="Upload Logo"
        />
      </div>

      {/* Banner */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-primary">Shop Banner</label>
        <ProductImageUploader
          endpoint="shopBanner"
          value={banner}
          onChange={setBanner}
          maxFiles={1}
          label="Upload Banner"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded text-sm transition-colors"
      >
        {isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/(seller)/seller/(portal)/settings/page.tsx`**

```tsx
import { redirect } from "next/navigation"
import { getCurrentShop } from "@/lib/seller/queries"
import ShopSettingsForm from "@/components/seller/ShopSettingsForm"

export const metadata = { title: "Shop Settings | Seller Centre" }

export default async function SettingsPage() {
  const shop = await getCurrentShop()
  if (!shop) redirect("/seller/onboarding")

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Shop Settings</h1>
      <div className="bg-white rounded-lg border border-border-default p-6">
        <ShopSettingsForm
          initialName={shop.name}
          initialLogo={shop.logo}
          initialBanner={shop.banner}
          slug={shop.slug}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add "Shop Settings" to `SellerSidebar` nav**

In `components/seller/SellerSidebar.tsx`, find the `NAV` array:

```ts
const NAV = [
  { label: "Dashboard", href: "/seller/dashboard" },
  { label: "All Products", href: "/seller/products" },
  { label: "Add Product", href: "/seller/products/new" },
  { label: "Orders", href: "/seller/orders" },
]
```

Replace it with:

```ts
const NAV = [
  { label: "Dashboard", href: "/seller/dashboard" },
  { label: "All Products", href: "/seller/products" },
  { label: "Add Product", href: "/seller/products/new" },
  { label: "Orders", href: "/seller/orders" },
  { label: "Shop Settings", href: "/seller/settings" },
]
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify manually**

```bash
npm run dev
```

Sign in as a seller and navigate to `/seller/settings`. Verify:
- The page loads with the current shop name, logo, and banner pre-filled
- "Shop Settings" appears in the sidebar and highlights when active
- Changing the name and clicking Save fires `toast.success("Shop updated!")`
- After save, navigating to `/shop/[slug]` shows the updated name
- Submitting with an empty name fires `toast.error("Shop name is required")`

- [ ] **Step 6: Commit**

```bash
git add components/seller/ShopSettingsForm.tsx "app/(seller)/seller/(portal)/settings/page.tsx" components/seller/SellerSidebar.tsx
git commit -m "feat(seller): add shop settings page with name, logo, and banner editing"
```
