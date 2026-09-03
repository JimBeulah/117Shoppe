-- AlterEnum
ALTER TYPE "CoinType" ADD VALUE 'EXPIRED';
ALTER TYPE "CoinType" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "coinsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "coinDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Coin" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "remaining" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Coin_userId_createdAt_idx" ON "Coin"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Coin_userId_expiresAt_idx" ON "Coin"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Coin_orderId_type_idx" ON "Coin"("orderId", "type");

-- AddForeignKey
ALTER TABLE "Coin" ADD CONSTRAINT "Coin_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: give every user with a nonzero balance one opening EARNED
-- batch so the ledger's `remaining` invariant (User.coins == sum(remaining))
-- holds from day one. No Coin rows exist yet at this point in the app's
-- history, so this only needs to run once.
INSERT INTO "Coin" ("id", "userId", "amount", "type", "description", "remaining", "expiresAt", "createdAt")
SELECT
  'coin_opening_' || "id",
  "id",
  "coins",
  'EARNED',
  'Opening balance',
  "coins",
  NOW() + INTERVAL '365 days',
  NOW()
FROM "User"
WHERE "coins" > 0;
