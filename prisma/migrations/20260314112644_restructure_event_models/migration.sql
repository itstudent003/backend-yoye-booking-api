/*
  Warnings:

  - You are about to drop the `event_custom_fields` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `event_insights` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `event_showtimes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ticket_zones` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_eventId_fkey";

-- DropForeignKey
ALTER TABLE "deposit_transactions" DROP CONSTRAINT "deposit_transactions_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_custom_fields" DROP CONSTRAINT "event_custom_fields_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_insights" DROP CONSTRAINT "event_insights_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_showtimes" DROP CONSTRAINT "event_showtimes_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_zones" DROP CONSTRAINT "ticket_zones_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_zones" DROP CONSTRAINT "ticket_zones_showtimeId_fkey";

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "eventId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "deposit_transactions" ALTER COLUMN "eventId" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "event_custom_fields";

-- DropTable
DROP TABLE "event_insights";

-- DropTable
DROP TABLE "event_showtimes";

-- DropTable
DROP TABLE "events";

-- DropTable
DROP TABLE "ticket_zones";

-- DropEnum
DROP TYPE "InsightMode";

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "posterUrl" TEXT,
    "posterImage" TEXT,
    "type" "EventType" NOT NULL,
    "eventDate" TIMESTAMP(3),
    "feePerEntry" DECIMAL(65,30),
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowRound" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "fee" DECIMAL(65,30) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "roundId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeepInfoField" (
    "id" TEXT NOT NULL,
    "otherCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeepInfoField_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShowRound" ADD CONSTRAINT "ShowRound_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ShowRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepInfoField" ADD CONSTRAINT "DeepInfoField_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
