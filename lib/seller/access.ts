import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/data/user"
import type { Shop, StaffPermission } from "@/lib/generated/prisma/client"

export type ShopAccess = {
  shop: Shop
  isOwner: boolean
  permissions: StaffPermission[]
}

export async function getShopAccess(): Promise<ShopAccess | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const ownedShop = await prisma.shop.findUnique({ where: { ownerId: user.id } })
  if (ownedShop) return { shop: ownedShop, isOwner: true, permissions: [] }

  const membership = await prisma.shopStaff.findFirst({
    where: { userId: user.id },
    include: { shop: true },
    orderBy: { createdAt: "asc" },
  })
  if (!membership) return null

  return { shop: membership.shop, isOwner: false, permissions: membership.permissions }
}

export function canAccess(access: ShopAccess, permission?: StaffPermission) {
  if (access.isOwner) return true
  if (!permission) return false
  return access.permissions.includes(permission)
}

export async function requireShopAccess(permission?: StaffPermission): Promise<Shop | null> {
  const access = await getShopAccess()
  if (!access || !canAccess(access, permission)) return null
  return access.shop
}
