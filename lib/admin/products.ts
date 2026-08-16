"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { assertAdmin } from "@/lib/admin/actions"
import { writeAuditLog } from "@/lib/admin/audit"

export async function approveProduct(productId: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return { error: "Product not found" }

  await prisma.product.update({
    where: { id: productId },
    data: { status: "APPROVED", rejectionReason: null },
  })

  await writeAuditLog(admin.id, "product.approve", "Product", productId)
  revalidatePath("/admin/products")
  return {}
}

export async function rejectProduct(productId: string, reason: string): Promise<{ error?: string }> {
  const admin = await assertAdmin()
  if (!reason.trim()) return { error: "A reason is required" }
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return { error: "Product not found" }

  await prisma.product.update({
    where: { id: productId },
    data: { status: "REJECTED", rejectionReason: reason },
  })

  await writeAuditLog(admin.id, "product.reject", "Product", productId, { reason })
  revalidatePath("/admin/products")
  return {}
}
