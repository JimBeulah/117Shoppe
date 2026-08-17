-- CreateEnum
CREATE TYPE "ReturnRequestType" AS ENUM ('REFUND_ONLY', 'RETURN_AND_REFUND');

-- CreateEnum
CREATE TYPE "ReturnRequestReason" AS ENUM ('ITEM_NOT_RECEIVED', 'ITEM_DEFECTIVE', 'WRONG_ITEM_SENT', 'MISSING_PARTS', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnRequestStatus" AS ENUM ('PENDING_SELLER', 'SELLER_APPROVED', 'SELLER_REJECTED', 'ADMIN_REVIEW', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('ORDER_PLACED', 'PAYMENT_RECEIVED', 'ORDER_SHIPPED', 'DELIVERY_STATUS_UPDATED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'RETURN_REQUESTED', 'RETURN_SELLER_APPROVED', 'RETURN_SELLER_REJECTED', 'RETURN_ESCALATED_TO_ADMIN', 'RETURN_ADMIN_APPROVED', 'RETURN_ADMIN_REJECTED', 'RETURN_CANCELLED_BY_BUYER', 'REFUND_ISSUED', 'ORDER_STATUS_CHANGED_BY_ADMIN');

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "ReturnRequestType" NOT NULL,
    "reason" "ReturnRequestReason" NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ReturnRequestStatus" NOT NULL DEFAULT 'PENDING_SELLER',
    "sellerReviewDeadline" TIMESTAMP(3) NOT NULL,
    "sellerDecisionNote" TEXT,
    "sellerDecidedAt" TIMESTAMP(3),
    "sellerDecidedByUserId" TEXT,
    "adminDecisionNote" TEXT,
    "adminDecidedAt" TIMESTAMP(3),
    "adminDecidedByUserId" TEXT,
    "refundId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTimelineEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_orderId_key" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_refundId_key" ON "ReturnRequest"("refundId");

-- CreateIndex
CREATE INDEX "ReturnRequest_shopId_status_idx" ON "ReturnRequest"("shopId", "status");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_sellerReviewDeadline_idx" ON "ReturnRequest"("status", "sellerReviewDeadline");

-- CreateIndex
CREATE INDEX "OrderTimelineEvent_orderId_createdAt_idx" ON "OrderTimelineEvent"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_sellerDecidedByUserId_fkey" FOREIGN KEY ("sellerDecidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_adminDecidedByUserId_fkey" FOREIGN KEY ("adminDecidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimelineEvent" ADD CONSTRAINT "OrderTimelineEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimelineEvent" ADD CONSTRAINT "OrderTimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
