-- CreateTable
CREATE TABLE "refund_request_logs" (
    "id" SERIAL NOT NULL,
    "refundRequestId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_request_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "refund_request_logs" ADD CONSTRAINT "refund_request_logs_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_request_logs" ADD CONSTRAINT "refund_request_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
