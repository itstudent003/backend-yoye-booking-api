/*
  Warnings:

  - You are about to drop the column `assignedAdminId` on the `bookings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_assignedAdminId_fkey";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "assignedAdminId",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;
