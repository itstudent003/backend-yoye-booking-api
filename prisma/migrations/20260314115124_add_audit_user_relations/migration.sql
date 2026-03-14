/*
  Warnings:

  - You are about to drop the column `createdBy` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `deletedBy` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "createdBy",
DROP COLUMN "deletedBy",
DROP COLUMN "updatedBy",
ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "deletedById" INTEGER,
ADD COLUMN     "updatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
