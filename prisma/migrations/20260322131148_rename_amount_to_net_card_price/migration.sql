/*
  Warnings:

  - The values [DEPOSIT,TICKET,PRODUCT,SERVICE_FEE,OTHER] on the enum `PaymentSlipType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `label` on the `booking_items` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `booking_items` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `booking_items` table. All the data in the column will be lost.
  - You are about to drop the column `showRoundId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `zoneId` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentSlipType_new" AS ENUM ('DEPOSIT_PAID', 'CARD_PAID', 'SERVICE_PAID');
ALTER TABLE "payment_slips" ALTER COLUMN "type" TYPE "PaymentSlipType_new" USING ("type"::text::"PaymentSlipType_new");
ALTER TYPE "PaymentSlipType" RENAME TO "PaymentSlipType_old";
ALTER TYPE "PaymentSlipType_new" RENAME TO "PaymentSlipType";
DROP TYPE "PaymentSlipType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_showRoundId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_zoneId_fkey";

-- AlterTable
ALTER TABLE "booking_items" DROP COLUMN "label",
DROP COLUMN "totalPrice",
DROP COLUMN "unitPrice";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "showRoundId",
DROP COLUMN "zoneId";
