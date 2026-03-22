-- AlterTable: rename "amount" to "netCardPrice" in bookings
ALTER TABLE "bookings" RENAME COLUMN "amount" TO "netCardPrice";