-- Documents a column that was previously added directly to the dev database
-- (outside migration history, likely via `prisma db push`) so migration
-- history matches the actual schema going forward.
ALTER TABLE "Category" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
