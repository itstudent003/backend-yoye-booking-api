/*
  Warnings:

  - You are about to drop the column `paymentSlipId` on the `refund_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_paymentSlipId_fkey";

-- AlterTable
ALTER TABLE "refund_requests" DROP COLUMN "paymentSlipId";
