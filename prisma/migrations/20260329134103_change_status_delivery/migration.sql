/*
  Warnings:

  - The values [WAITING_PICKUP,READY_FOR_PICKUP,PICKED_UP,SHIPPED] on the enum `DeliveryStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryStatus_new" AS ENUM ('NOT_STARTED', 'WAITING_DELIVERY', 'DELIVERED', 'CANCELLED');
ALTER TABLE "fulfillments" ALTER COLUMN "deliveryStatus" DROP DEFAULT;
ALTER TABLE "fulfillments" ALTER COLUMN "deliveryStatus" TYPE "DeliveryStatus_new" USING ("deliveryStatus"::text::"DeliveryStatus_new");
ALTER TYPE "DeliveryStatus" RENAME TO "DeliveryStatus_old";
ALTER TYPE "DeliveryStatus_new" RENAME TO "DeliveryStatus";
DROP TYPE "DeliveryStatus_old";
ALTER TABLE "fulfillments" ALTER COLUMN "deliveryStatus" SET DEFAULT 'NOT_STARTED';
COMMIT;
