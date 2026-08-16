-- CreateEnum
CREATE TYPE "StaffPermission" AS ENUM ('PRODUCTS', 'ORDERS', 'REVIEWS', 'CHAT');

-- CreateTable
CREATE TABLE "ShopStaff" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" "StaffPermission"[],
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopStaff_userId_idx" ON "ShopStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopStaff_shopId_userId_key" ON "ShopStaff"("shopId", "userId");

-- AddForeignKey
ALTER TABLE "ShopStaff" ADD CONSTRAINT "ShopStaff_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStaff" ADD CONSTRAINT "ShopStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStaff" ADD CONSTRAINT "ShopStaff_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
