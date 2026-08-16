-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "isOnVacation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vacationMessage" TEXT;
