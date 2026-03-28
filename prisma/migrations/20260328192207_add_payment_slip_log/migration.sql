-- CreateTable
CREATE TABLE "payment_slip_logs" (
    "id" SERIAL NOT NULL,
    "paymentSlipId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "status" "PaymentSlipStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_slip_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_slip_logs" ADD CONSTRAINT "payment_slip_logs_paymentSlipId_fkey" FOREIGN KEY ("paymentSlipId") REFERENCES "payment_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_slip_logs" ADD CONSTRAINT "payment_slip_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
