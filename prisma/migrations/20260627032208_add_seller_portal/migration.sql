-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "variantOptions" JSONB;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "ShopStatus" NOT NULL DEFAULT 'PENDING';
