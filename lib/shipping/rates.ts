import { prisma } from "@/lib/db"

export interface ShippingRateOption {
  methodId: string
  name: string
  carrier: string
  price: number
  estimatedDaysMin: number
  estimatedDaysMax: number
}

export async function getAvailableRatesForShop(shopId: string, province: string): Promise<ShippingRateOption[]> {
  const zone = await prisma.shippingZone.findFirst({ where: { provinces: { has: province } } })
  if (!zone) return []

  const links = await prisma.shopShippingMethod.findMany({
    where: { shopId, isEnabled: true, method: { isActive: true } },
    select: { methodId: true },
  })
  if (links.length === 0) return []

  const rates = await prisma.shippingRate.findMany({
    where: { zoneId: zone.id, methodId: { in: links.map((l) => l.methodId) } },
    include: { method: true },
  })

  return rates.map((r) => ({
    methodId: r.methodId,
    name: r.method.name,
    carrier: r.method.carrier,
    price: r.price,
    estimatedDaysMin: r.estimatedDaysMin,
    estimatedDaysMax: r.estimatedDaysMax,
  }))
}

export async function getShippingOptionsForShops(
  shopIds: string[],
  province: string
): Promise<Record<string, ShippingRateOption[]>> {
  const entries = await Promise.all(
    shopIds.map(async (shopId) => [shopId, await getAvailableRatesForShop(shopId, province)] as const)
  )
  return Object.fromEntries(entries)
}
