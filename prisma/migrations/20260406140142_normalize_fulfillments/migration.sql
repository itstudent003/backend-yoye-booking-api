/*
  Warnings:

  - You are about to drop the column `queueCode` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `serviceFee` on the `fulfillments` table. All the data in the column will be lost.
  - You are about to drop the column `shippingFee` on the `fulfillments` table. All the data in the column will be lost.
  - You are about to drop the column `totalCharge` on the `fulfillments` table. All the data in the column will be lost.
  - You are about to drop the column `vatAmount` on the `fulfillments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "bookings_queueCode_key";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "queueCode";

-- AlterTable
ALTER TABLE "fulfillments" DROP COLUMN "serviceFee",
DROP COLUMN "shippingFee",
DROP COLUMN "totalCharge",
DROP COLUMN "vatAmount";
