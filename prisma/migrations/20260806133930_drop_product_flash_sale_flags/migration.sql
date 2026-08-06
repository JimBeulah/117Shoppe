/*
  Warnings:

  - You are about to drop the column `flashSaleEndsAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `flashSalePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `isFlashSale` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "flashSaleEndsAt",
DROP COLUMN "flashSalePrice",
DROP COLUMN "isFlashSale";
