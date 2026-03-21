-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "nameCustomer" TEXT,
ADD COLUMN     "showRoundId" INTEGER,
ADD COLUMN     "zoneId" INTEGER;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_showRoundId_fkey" FOREIGN KEY ("showRoundId") REFERENCES "ShowRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
