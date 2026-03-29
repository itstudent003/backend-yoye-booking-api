-- CreateEnum
CREATE TYPE "BillAction" AS ENUM ('CREATE', 'EDIT');

-- CreateTable
CREATE TABLE "fulfillment_logs" (
    "id" SERIAL NOT NULL,
    "fulfillmentId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "action" "BillAction" NOT NULL,
    "fulfillmentType" "FulfillmentType" NOT NULL,
    "serviceFee" DOUBLE PRECISION NOT NULL,
    "shippingFee" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "totalCharge" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fulfillment_logs" ADD CONSTRAINT "fulfillment_logs_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "fulfillments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_logs" ADD CONSTRAINT "fulfillment_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
