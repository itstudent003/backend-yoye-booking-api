/*
  Warnings:

  - The values [PENDING_APPROVAL,IN_PROGRESS,READY_FOR_FULFILLMENT] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdById` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `deletedById` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `updatedById` on the `Event` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('WAITING_QUEUE_APPROVAL', 'WAITING_DEPOSIT_TRANSFER', 'WAITING_DEPOSIT_VERIFY', 'QUEUE_BOOKED', 'WAITING_BOOKING_INFO', 'TRANSFERRING_TICKET', 'CONFIRMING_TICKET', 'WAITING_ADMIN_CONFIRM', 'READY_TO_BOOK', 'BOOKING_IN_PROGRESS', 'PARTIALLY_BOOKED', 'FULLY_BOOKED', 'BOOKING_FAILED', 'CUSTOMER_SELF_BOOKED', 'TEAM_NOT_RECEIVED', 'TEAM_BOOKED', 'PARTIAL_SELF_TEAM_BOOKING', 'WAITING_SERVICE_FEE', 'WAITING_SERVICE_FEE_VERIFY', 'SERVICE_FEE_PAID', 'DEPOSIT_PENDING', 'DEPOSIT_USED', 'DEPOSIT_FORFEITED', 'WAITING_REFUND', 'REFUNDED', 'COMPLETED', 'CANCELLED', 'CLOSED_REFUNDED');
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TABLE "booking_status_logs" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'WAITING_QUEUE_APPROVAL';
COMMIT;

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_updatedById_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "createdById",
DROP COLUMN "deletedById",
DROP COLUMN "updatedById",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'WAITING_QUEUE_APPROVAL';

-- CreateTable
CREATE TABLE "booking_items" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "roundId" INTEGER,
    "zoneId" INTEGER,
    "label" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deep_info_responses" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deep_info_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deep_info_responses_bookingId_fieldId_key" ON "deep_info_responses"("bookingId", "fieldId");

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ShowRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deep_info_responses" ADD CONSTRAINT "deep_info_responses_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deep_info_responses" ADD CONSTRAINT "deep_info_responses_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "DeepInfoField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
