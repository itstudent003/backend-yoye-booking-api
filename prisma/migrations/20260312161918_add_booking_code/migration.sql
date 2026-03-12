/*
  Warnings:

  - The primary key for the `accounts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `accounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `activity_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `activity_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `entityId` column on the `activity_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `billing_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `billing_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `booking_status_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `booking_status_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `bookings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `bookings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `assignedAdminId` column on the `bookings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `customers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `deposit_transactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `deposit_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `bookingId` column on the `deposit_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `eventId` column on the `deposit_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `event_custom_fields` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `event_custom_fields` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `event_insights` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `event_insights` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `event_showtimes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `event_showtimes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `form_submissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `form_submissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `fulfillments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `fulfillments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `payment_slips` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `payment_slips` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `reviewerId` column on the `payment_slips` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `refund_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `refund_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentSlipId` column on the `refund_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `processedById` column on the `refund_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ticket_zones` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `ticket_zones` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[bookingCode]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `userId` on the `accounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `activity_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `bookingId` on the `billing_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `bookingId` on the `booking_status_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `changedBy` on the `booking_status_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `bookingCode` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `eventId` on the `bookings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `customerId` on the `bookings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventId` on the `event_custom_fields` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventId` on the `event_insights` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventId` on the `event_showtimes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `createdBy` on the `events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `bookingId` on the `form_submissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `bookingId` on the `fulfillments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `bookingId` on the `payment_slips` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `bookingId` on the `refund_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventId` on the `ticket_zones` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `showtimeId` on the `ticket_zones` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "billing_records" DROP CONSTRAINT "billing_records_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "booking_status_logs" DROP CONSTRAINT "booking_status_logs_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "booking_status_logs" DROP CONSTRAINT "booking_status_logs_changedBy_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_assignedAdminId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_customerId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_eventId_fkey";

-- DropForeignKey
ALTER TABLE "deposit_transactions" DROP CONSTRAINT "deposit_transactions_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "deposit_transactions" DROP CONSTRAINT "deposit_transactions_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_custom_fields" DROP CONSTRAINT "event_custom_fields_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_insights" DROP CONSTRAINT "event_insights_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_showtimes" DROP CONSTRAINT "event_showtimes_eventId_fkey";

-- DropForeignKey
ALTER TABLE "form_submissions" DROP CONSTRAINT "form_submissions_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "fulfillments" DROP CONSTRAINT "fulfillments_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "payment_slips" DROP CONSTRAINT "payment_slips_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "payment_slips" DROP CONSTRAINT "payment_slips_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_paymentSlipId_fkey";

-- DropForeignKey
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_processedById_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_zones" DROP CONSTRAINT "ticket_zones_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_zones" DROP CONSTRAINT "ticket_zones_showtimeId_fkey";

-- AlterTable
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL,
DROP COLUMN "entityId",
ADD COLUMN     "entityId" INTEGER,
ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "billing_records" DROP CONSTRAINT "billing_records_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "bookingId",
ADD COLUMN     "bookingId" INTEGER NOT NULL,
ADD CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "booking_status_logs" DROP CONSTRAINT "booking_status_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "bookingId",
ADD COLUMN     "bookingId" INTEGER NOT NULL,
DROP COLUMN "changedBy",
ADD COLUMN     "changedBy" INTEGER NOT NULL,
ADD CONSTRAINT "booking_status_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_pkey",
ADD COLUMN     "bookingCode" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER NOT NULL,
DROP COLUMN "customerId",
ADD COLUMN     "customerId" INTEGER NOT NULL,
DROP COLUMN "assignedAdminId",
ADD COLUMN     "assignedAdminId" INTEGER,
ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "customers" DROP CONSTRAINT "customers_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "deposit_transactions" DROP CONSTRAINT "deposit_transactions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "bookingId",
ADD COLUMN     "bookingId" INTEGER,
DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER,
ADD CONSTRAINT "deposit_transactions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "event_custom_fields" DROP CONSTRAINT "event_custom_fields_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER NOT NULL,
ADD CONSTRAINT "event_custom_fields_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "event_insights" DROP CONSTRAINT "event_insights_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER NOT NULL,
ADD CONSTRAINT "event_insights_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "event_showtimes" DROP CONSTRAINT "event_showtimes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER NOT NULL,
ADD CONSTRAINT "event_showtimes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "events" DROP CONSTRAINT "events_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "createdBy",
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "form_submissions" DROP CONSTRAINT "form_submissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "bookingId",
ADD COLUMN     "bookingId" INTEGER NOT NULL,
ADD CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "fulfillments" DROP CONSTRAINT "fulfillments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "bookingId",
ADD COLUMN     "bookingId" INTEGER NOT NULL,
ADD CONSTRAINT "fulfillments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment_slips" DROP CONSTRAINT "payment_slips_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "bookingId",
ADD COLUMN     "bookingId" INTEGER NOT NULL,
DROP COLUMN "reviewerId",
ADD COLUMN     "reviewerId" INTEGER,
ADD CONSTRAINT "payment_slips_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "bookingId",
ADD COLUMN     "bookingId" INTEGER NOT NULL,
DROP COLUMN "paymentSlipId",
ADD COLUMN     "paymentSlipId" INTEGER,
DROP COLUMN "processedById",
ADD COLUMN     "processedById" INTEGER,
ADD CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ticket_zones" DROP CONSTRAINT "ticket_zones_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER NOT NULL,
DROP COLUMN "showtimeId",
ADD COLUMN     "showtimeId" INTEGER NOT NULL,
ADD CONSTRAINT "ticket_zones_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_records_bookingId_key" ON "billing_records"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingCode_key" ON "bookings"("bookingCode");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_bookingId_key" ON "form_submissions"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillments_bookingId_key" ON "fulfillments"("bookingId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_showtimes" ADD CONSTRAINT "event_showtimes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_zones" ADD CONSTRAINT "ticket_zones_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_zones" ADD CONSTRAINT "ticket_zones_showtimeId_fkey" FOREIGN KEY ("showtimeId") REFERENCES "event_showtimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_custom_fields" ADD CONSTRAINT "event_custom_fields_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_insights" ADD CONSTRAINT "event_insights_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_paymentSlipId_fkey" FOREIGN KEY ("paymentSlipId") REFERENCES "payment_slips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_logs" ADD CONSTRAINT "booking_status_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_logs" ADD CONSTRAINT "booking_status_logs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
