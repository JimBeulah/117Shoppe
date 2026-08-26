-- CreateIndex
CREATE INDEX "Conversation_shopId_idx" ON "Conversation"("shopId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_receiverId_isRead_idx" ON "Message"("receiverId", "isRead");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_shopId_status_idx" ON "Order"("shopId", "status");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_status_isActive_categoryId_idx" ON "Product"("status", "isActive", "categoryId");

-- CreateIndex
CREATE INDEX "Product_status_isActive_shopId_idx" ON "Product"("status", "isActive", "shopId");

-- CreateIndex
CREATE INDEX "Product_status_isActive_sold_idx" ON "Product"("status", "isActive", "sold");

-- CreateIndex
CREATE INDEX "Product_status_isActive_createdAt_idx" ON "Product"("status", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");
