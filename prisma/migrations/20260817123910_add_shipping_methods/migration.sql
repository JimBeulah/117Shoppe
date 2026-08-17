/*
  Warnings:

  - The `status` column on the `Shipment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingMethodId" TEXT,
ADD COLUMN     "shippingMethodName" TEXT;

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "status",
ADD COLUMN     "status" "DeliveryStatus" NOT NULL DEFAULT 'PACKED';

-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provinces" TEXT[],

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "estimatedDaysMin" INTEGER NOT NULL,
    "estimatedDaysMax" INTEGER NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShippingMethod" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopShippingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZone_name_key" ON "ShippingZone"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_methodId_zoneId_key" ON "ShippingRate"("methodId", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopShippingMethod_shopId_methodId_key" ON "ShopShippingMethod"("shopId", "methodId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "ShippingMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShippingMethod" ADD CONSTRAINT "ShopShippingMethod_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShippingMethod" ADD CONSTRAINT "ShopShippingMethod_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "ShippingMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
