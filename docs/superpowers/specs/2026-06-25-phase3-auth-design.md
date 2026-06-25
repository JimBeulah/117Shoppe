# Phase 3: Auth — Design Spec

**Date:** 2026-06-25
**Status:** Approved
**Phase:** 3 of 10

---

## Overview

Add Clerk-based authentication to Eshopee: buyer sign-in, sign-up, and a profile page. Clerk is the identity provider (passwords, sessions, OAuth). The Prisma `User` table remains the relational anchor for all app data (orders, cart, reviews, etc.), linked to Clerk via a `clerkId` field. A webhook syncs Clerk → Prisma on `user.created`.

---

## Architecture

```
Clerk (identity)              Prisma (app data)
────────────────              ─────────────────
user.created ──webhook──────► User { clerkId, name, email, role: BUYER }
session JWT  ──publicMetadata► role available in middleware (no DB call)
updateUser() ──Server Action─► sync name to Prisma User
```

- Clerk owns: passwords, session tokens, OAuth, avatar uploads
- Prisma owns: role, coins, orders, cart, addresses, reviews — all relational data
- `User.clerkId` is the bridge between the two
- Role is stored in Clerk `publicMetadata.role` AND in `Prisma User.role` — Clerk's copy is used for middleware (fast, no DB), Prisma's copy is used for app queries

---

## Prisma Schema Changes

Two changes to the `User` model — one migration required:

```prisma
model User {
  id           String   @id @default(cuid())
  clerkId      String   @unique          // ← NEW: Clerk user ID
  name         String
  email        String   @unique
  passwordHash String?                   // ← CHANGED: nullable (Clerk owns passwords)
  role         Role     @default(BUYER)
  avatar       String?
  coins        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  // ... relations unchanged
}
```

---

## Route Structure

```
app/
├── (auth)/
│   ├── layout.tsx                         ← already exists (centered card, brand-50 bg)
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx                   ← renders <SignIn />
│   └── sign-up/
│       └── [[...sign-up]]/
│           └── page.tsx                   ← renders <SignUp />
├── (shop)/
│   └── account/
│       └── profile/
│           └── page.tsx                   ← protected buyer profile
└── api/
    └── webhooks/
        └── clerk/
            └── route.ts                   ← user.created → Prisma User
```

The `[[...sign-in]]` and `[[...sign-up]]` catch-all segments are required by Clerk for its internal SSO and redirect flows.

### Clerk Environment Variables (`.env.local`)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

---

## Clerk Setup

### Root Layout

`ClerkProvider` wraps the app inside `<body>` (not `<html>`):

```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
```

### Middleware (`middleware.ts`)

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/account/:path*'])
const isSellerRoute = createRouteMatcher(['/seller/:path*'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) || isSellerRoute(req)) {
    await auth.protect() // redirects to /sign-in if not authenticated
  }

  if (isSellerRoute(req)) {
    const { sessionClaims } = await auth()
    if (sessionClaims?.metadata?.role !== 'SELLER') {
      return Response.redirect(new URL('/', req.url))
    }
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)', '/__clerk/:path*'],
}
```

### Clerk Dashboard Configuration

After `clerk init`, configure in the Clerk Dashboard:

1. **Session token customization** — add to JWT:
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```
   This makes `sessionClaims.metadata.role` available in middleware without a DB call.

2. **Redirect URLs** — set allowed redirect URLs to include `http://localhost:3000`.

3. **Sign-in/sign-up URLs** — set to `/sign-in` and `/sign-up`.

---

## Auth Pages

Both pages are thin wrappers around Clerk's embedded components. The `(auth)` layout's centered card provides the surrounding UI.

```tsx
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return <SignIn />
}
```

```tsx
// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return <SignUp />
}
```

Clerk's components handle all form logic, validation, OAuth buttons, and error states. No custom form code needed.

---

## Webhook (`/api/webhooks/clerk`)

Handles `user.created` events. Uses `svix` (installed by `clerk init`) for signature verification.

```ts
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = await headers()

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      'svix-id': headerPayload.get('svix-id')!,
      'svix-timestamp': headerPayload.get('svix-timestamp')!,
      'svix-signature': headerPayload.get('svix-signature')!,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = event.data
    const email = email_addresses[0]?.email_address
    const name = [first_name, last_name].filter(Boolean).join(' ') || email

    await prisma.user.create({
      data: {
        clerkId: id,
        email,
        name,
        avatar: image_url ?? null,
        role: 'BUYER',
      },
    })

    // Set role in Clerk publicMetadata
    await clerkClient().users.updateUserMetadata(id, {
      publicMetadata: { role: 'BUYER' },
    })
  }

  return new Response('OK', { status: 200 })
}
```

The webhook must be registered in the Clerk Dashboard → Webhooks, pointing to `https://<your-domain>/api/webhooks/clerk`, subscribed to `user.created`.

For local development, use the Clerk CLI or `ngrok`/`localtunnel` to expose the webhook endpoint.

---

## Navbar Changes

The existing `Navbar` component gets Clerk auth controls replacing any placeholder:

```tsx
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

// Inside Navbar:
<SignedOut>
  <SignInButton>
    <button className="...">Log In</button>
  </SignInButton>
  <SignUpButton>
    <button className="... bg-brand-600 text-white">Sign Up</button>
  </SignUpButton>
</SignedOut>
<SignedIn>
  <UserButton userProfileUrl="/account/profile" />
</SignedIn>
```

---

## Profile Page (`/account/profile`)

Server Component. Fetches the Prisma `User` by `clerkId` from `auth()`.

### Data displayed

| Field | Source | Editable |
|---|---|---|
| Name | Prisma (synced from Clerk) | Yes — Server Action |
| Email | Clerk | No (read-only) |
| Avatar | Clerk | Via `<UserButton>` modal |
| Role | Prisma `role` | No (read-only badge) |
| Member since | Prisma `createdAt` | No |

### Name edit — Server Action

```ts
// app/(shop)/account/profile/actions.ts
'use server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateProfileName(name: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await clerkClient().users.updateUser(userId, { firstName: name })
  await prisma.user.update({ where: { clerkId: userId }, data: { name } })
  revalidatePath('/account/profile')
}
```

Clerk is updated first. If it throws, Prisma is not updated — Clerk remains the source of truth.

### Page layout

```
/account/profile
├── Avatar (from Clerk via <UserButton> or <UserAvatar>)
├── Name field + Edit button → inline form → Server Action
├── Email (read-only)
├── Role badge ("Buyer")
└── Member since date
```

---

## Data Helper (`lib/data/user.ts`)

```ts
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null
  return prisma.user.findUnique({ where: { clerkId: userId } })
}
```

Used by the profile page and any future Server Component that needs the Prisma user.

---

## What's Explicitly Out of Scope

- Seller registration / seller role assignment (Phase 6)
- Address management on the profile page (Phase 4)
- Order history on the profile page (Phase 4)
- Admin panel (not planned)
- Email verification customization (Clerk handles it)
- Account deletion (post-MVP)
