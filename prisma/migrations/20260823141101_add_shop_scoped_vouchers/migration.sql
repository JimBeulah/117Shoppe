-- AlterEnum
ALTER TYPE "StaffPermission" ADD VALUE 'VOUCHERS';

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "shopId" TEXT;

-- CreateIndex
CREATE INDEX "Voucher_shopId_idx" ON "Voucher"("shopId");

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
