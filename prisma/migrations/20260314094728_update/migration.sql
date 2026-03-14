/*
  Warnings:

  - You are about to drop the column `category` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "category";

-- DropEnum
DROP TYPE "EventCategory";
