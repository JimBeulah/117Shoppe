-- Migration: add clerkId to User and make passwordHash nullable
-- Uses a temporary default so existing seeded rows satisfy NOT NULL,
-- then drops the default so new rows must always supply a real Clerk ID.

-- Step 1: Add clerkId with a temporary default to handle existing rows
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT NOT NULL DEFAULT 'seed_placeholder';

-- Step 2: Make each existing row's clerkId unique by appending the row id
UPDATE "User" SET "clerkId" = 'seed_placeholder_' || "id";

-- Step 3: Remove the column default (new rows must provide a real Clerk ID)
ALTER TABLE "User" ALTER COLUMN "clerkId" DROP DEFAULT;

-- Step 4: Add unique constraint
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- Step 5: Make passwordHash nullable (no data issues — existing rows keep their values)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
