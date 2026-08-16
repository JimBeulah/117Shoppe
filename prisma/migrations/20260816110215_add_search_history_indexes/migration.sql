-- CreateIndex
CREATE INDEX "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchHistory_query_createdAt_idx" ON "SearchHistory"("query", "createdAt");
