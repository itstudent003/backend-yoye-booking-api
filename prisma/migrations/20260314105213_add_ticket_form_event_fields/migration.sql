/*
  Warnings:

  - You are about to drop the column `remarks` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "event_custom_fields" ADD COLUMN     "otherCode" TEXT;

-- AlterTable
ALTER TABLE "event_showtimes" ADD COLUMN     "name" TEXT,
ALTER COLUMN "endsAt" DROP NOT NULL,
ALTER COLUMN "capacity" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "remarks",
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "deliveryOption" "FulfillmentType",
ADD COLUMN     "feePerEntry" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL;
