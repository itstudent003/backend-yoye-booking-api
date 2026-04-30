-- AlterTable
ALTER TABLE "booking_pressers"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" INTEGER;

-- CreateIndex
CREATE INDEX "booking_pressers_deletedAt_idx" ON "booking_pressers"("deletedAt");
