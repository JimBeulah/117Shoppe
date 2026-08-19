import { prisma } from "@/lib/db"
import { assertAdmin } from "@/lib/admin/actions"
import type { Prisma, StockMovementType } from "@/lib/generated/prisma/client"

const PAGE_SIZE = 20

const MOVEMENT_TYPES: StockMovementType[] = [
  "SALE",
  "CANCELLATION_RESTOCK",
  "REFUND_RESTOCK",
  "MANUAL_ADJUSTMENT",
  "RESTOCK_IN",
]

function movementSelect() {
  return {
    id: true,
    productId: true,
    variantId: true,
    type: true,
    delta: true,
    quantityBefore: true,
    quantityAfter: true,
    reason: true,
    orderId: true,
    actorRole: true,
    createdAt: true,
    product: { select: { name: true, slug: true } },
    variant: { select: { name: true } },
    actor: { select: { id: true, name: true, email: true } },
  } satisfies Prisma.StockMovementSelect
}

export async function getStockMovements(
  page: number,
  filters: { shopId?: string | null; productId?: string | null; type?: StockMovementType | null }
) {
  const where: Prisma.StockMovementWhereInput = {
    ...(filters.shopId ? { shopId: filters.shopId } : {}),
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      select: movementSelect(),
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.stockMovement.count({ where }),
  ])

  return { movements, total, pageSize: PAGE_SIZE, movementTypes: MOVEMENT_TYPES }
}

export async function getAdminStockMovements(
  page: number,
  filters: { shopId?: string | null; productId?: string | null; type?: StockMovementType | null }
) {
  await assertAdmin()
  return getStockMovements(page, filters)
}

export async function getShopStockOverview(shopId: string, search?: string | null) {
  const products = await prisma.product.findMany({
    where: {
      shopId,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      stock: true,
      isActive: true,
      variants: { select: { id: true, name: true, stock: true } },
      stockMovements: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  })

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0] ?? null,
    stock: p.stock,
    isActive: p.isActive,
    variants: p.variants,
    lastMovementAt: p.stockMovements[0]?.createdAt ?? null,
  }))
}

export async function getAllStockOverview(search?: string | null) {
  await assertAdmin()
  const products = await prisma.product.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : {},
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      stock: true,
      isActive: true,
      shop: { select: { id: true, name: true } },
      variants: { select: { id: true, name: true, stock: true } },
      stockMovements: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
    take: 100,
  })

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0] ?? null,
    stock: p.stock,
    isActive: p.isActive,
    shop: p.shop,
    variants: p.variants,
    lastMovementAt: p.stockMovements[0]?.createdAt ?? null,
  }))
}

export async function getProductWithMovements(
  productId: string,
  page: number,
  opts: { shopId?: string | null } = {}
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      stock: true,
      shopId: true,
      variants: { select: { id: true, name: true, stock: true, sku: true } },
    },
  })
  if (!product) return null
  if (opts.shopId && product.shopId !== opts.shopId) return null

  const { movements, total, pageSize } = await getStockMovements(page, { productId })
  return { product, movements, total, pageSize }
}
