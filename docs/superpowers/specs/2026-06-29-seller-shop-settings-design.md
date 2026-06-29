# Seller Shop Settings Page — Design Spec

**Date:** 2026-06-29
**Status:** Approved

## Overview

Add a Shop Settings page at `/seller/settings` so sellers can update their shop name, logo, and banner after onboarding. The shop URL (slug) is intentionally read-only — changing it would break all existing links.

## Architecture

### Route

`app/(seller)/seller/(portal)/settings/page.tsx` — inside the existing `(portal)` route group, inheriting auth guards, shop status checks, and the `SellerSidebar` automatically.

### Server Action (`lib/seller/actions.ts`)

**`updateShop(formData: FormData): Promise<{ error?: string }>`**

- Calls existing `getVerifiedShop()` helper to confirm the caller is an authenticated SELLER who owns a shop
- Returns `{ error: "Unauthorized" }` if not
- Reads `name`, `logo`, `banner` from `formData`
- Validates: `name` must be non-empty (trimmed)
- Calls `prisma.shop.update({ where: { id: shop.id }, data: { name, logo, banner } })`
- Calls `revalidatePath('/seller/settings')` and `revalidatePath('/shop/${shop.slug}')` (so the public storefront reflects the change)
- Returns `{}` on success, `{ error: string }` on failure

### Page (`app/(seller)/seller/(portal)/settings/page.tsx`)

Server Component. Calls `getCurrentShop()` to load current values, passes them as props to `ShopSettingsForm`.

### Form Component (`components/seller/ShopSettingsForm.tsx`)

Client Component (`"use client"`). Receives initial shop values as props. Uses `useState` + `useTransition`. On submit calls `updateShop`, then `toast.success` or `toast.error` via Sonner.

### Sonner Toast Setup

- Install: `npm install sonner`
- Add `<Toaster />` to `app/(seller)/layout.tsx` (the seller root layout, not the portal layout) so it's available across the whole seller area including onboarding

### Sidebar

Add `{ label: "Shop Settings", href: "/seller/settings" }` to the `NAV` array in `components/seller/SellerSidebar.tsx`, after "Orders".

## Form Fields

| Field | Type | Editable | Notes |
|-------|------|----------|-------|
| Shop Name | Text input | ✅ | Required, max 60 chars |
| Shop Logo | UploadThing (`shopLogo` endpoint) | ✅ | maxFiles=1 |
| Shop Banner | UploadThing (`shopBanner` endpoint) | ✅ | maxFiles=1 |
| Shop URL | Read-only display | ❌ | Shows `eshopee.com/shop/{slug}` with note |

## UX

- Form is pre-filled with current shop values from the server
- Save button is disabled while `isPending`
- On success: `toast.success("Shop updated!")`
- On error: `toast.error(errorMessage)`
- Both `revalidatePath` calls ensure the seller settings page AND the public `/shop/[slug]` page reflect the change immediately

## What Is Not In Scope

- Changing the shop slug (would break existing links)
- Shop description / bio (no schema field yet)
- Deleting the shop
