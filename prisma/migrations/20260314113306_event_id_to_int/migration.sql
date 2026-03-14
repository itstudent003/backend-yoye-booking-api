/*
  Warnings:

  - The primary key for the `DeepInfoField` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `DeepInfoField` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Event` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Event` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ShowRound` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `ShowRound` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Zone` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Zone` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `eventId` column on the `deposit_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `eventId` on the `DeepInfoField` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventId` on the `ShowRound` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `roundId` on the `Zone` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventId` on the `bookings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "DeepInfoField" DROP CONSTRAINT "DeepInfoField_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ShowRound" DROP CONSTRAINT "ShowRound_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_roundId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_eventId_fkey";

-- DropForeignKey
ALTER TABLE "deposit_transactions" DROP CONSTRAINT "deposit_transactions_eventId_fkey";

-- AlterTable
ALTER TABLE "DeepInfoField" DROP CONSTRAINT "DeepInfoField_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER NOT NULL,
ADD CONSTRAINT "DeepInfoField_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Event" DROP CONSTRAINT "Event_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Event_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ShowRound" DROP CONSTRAINT "ShowRound_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER NOT NULL,
ADD CONSTRAINT "ShowRound_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "roundId",
ADD COLUMN     "roundId" INTEGER NOT NULL,
ADD CONSTRAINT "Zone_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "deposit_transactions" DROP COLUMN "eventId",
ADD COLUMN     "eventId" INTEGER;

-- AddForeignKey
ALTER TABLE "ShowRound" ADD CONSTRAINT "ShowRound_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ShowRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepInfoField" ADD CONSTRAINT "DeepInfoField_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
