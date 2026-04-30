-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "AdminRole" ADD VALUE 'PRESSER';

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('DEPOSIT_PENDING', 'DEPOSIT_USED', 'DEPOSIT_FORFEITED', 'WAITING_REFUND', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DepositReason" AS ENUM ('PRESS_SUCCESS', 'PRESS_FAILED', 'CUSTOMER_CANCEL', 'CUSTOMER_SELF_BOOKED', 'ADMIN_OVERRIDE');

-- CreateEnum
CREATE TYPE "RefundCategory" AS ENUM ('TICKET', 'DEPOSIT', 'PRICE_DIFF', 'SHIPPING', 'MIXED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('TRANSPORT', 'EQUIPMENT', 'FOOD', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpensePaidBy" AS ENUM ('COMPANY', 'TEAM');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('BOOKING_STATUS_CHANGED', 'SLIP_VERIFIED', 'SLIP_REJECTED', 'REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_REJECTED', 'REFUND_PAID', 'DEPOSIT_OVERRIDE', 'EXPENSE_SUBMITTED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'PRESSER_ASSIGNED', 'PRESSER_VIEW_CREDENTIAL', 'TICKET_RECORDED', 'TICKET_VOIDED');

-- AlterTable
ALTER TABLE "deposit_transactions"
ADD COLUMN "status" "DepositStatus",
ADD COLUMN "usedAmount" DECIMAL(10,2),
ADD COLUMN "refundAmount" DECIMAL(10,2),
ADD COLUMN "forfeitedAmount" DECIMAL(10,2),
ADD COLUMN "reason" "DepositReason",
ADD COLUMN "reasonNotes" TEXT,
ADD COLUMN "decidedById" INTEGER,
ADD COLUMN "decidedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "refund_requests"
ADD COLUMN "paymentSlipId" INTEGER,
ADD COLUMN "requestedById" INTEGER,
ADD COLUMN "category" "RefundCategory" NOT NULL DEFAULT 'MIXED',
ADD COLUMN "breakdown" JSONB,
ADD COLUMN "rejectionNote" TEXT,
ADD COLUMN "payoutSlipUrl" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "activity_logs"
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "entityType" DROP NOT NULL,
ADD COLUMN "actorId" INTEGER,
ADD COLUMN "entity" TEXT,
ADD COLUMN "type" "ActivityType",
ADD COLUMN "bookingId" INTEGER,
ADD COLUMN "bookingCode" TEXT,
ADD COLUMN "message" TEXT;

-- CreateTable
CREATE TABLE "booking_pressers" (
    "bookingId" INTEGER NOT NULL,
    "presserId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "booking_pressers_pkey" PRIMARY KEY ("bookingId","presserId")
);

-- CreateTable
CREATE TABLE "booked_tickets" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "zoneId" INTEGER,
    "zoneNameRaw" TEXT NOT NULL,
    "seat" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "pressedById" INTEGER NOT NULL,
    "pressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" INTEGER,

    CONSTRAINT "booked_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER,
    "eventId" INTEGER,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidBy" "ExpensePaidBy" NOT NULL,
    "receiptUrl" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectedNote" TEXT,
    "settledAt" TIMESTAMP(3),
    "settlementNote" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_credentials" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "bookingId" INTEGER,
    "site" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEncrypted" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deposit_transactions_status_idx" ON "deposit_transactions"("status");
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");
CREATE INDEX "refund_requests_bookingId_idx" ON "refund_requests"("bookingId");
CREATE INDEX "activity_logs_entity_entityId_idx" ON "activity_logs"("entity", "entityId");
CREATE INDEX "activity_logs_bookingId_idx" ON "activity_logs"("bookingId");
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");
CREATE INDEX "booking_pressers_presserId_idx" ON "booking_pressers"("presserId");
CREATE INDEX "booked_tickets_bookingId_idx" ON "booked_tickets"("bookingId");
CREATE INDEX "expenses_status_idx" ON "expenses"("status");
CREATE INDEX "expenses_submittedById_idx" ON "expenses"("submittedById");
CREATE INDEX "customer_credentials_bookingId_idx" ON "customer_credentials"("bookingId");
CREATE INDEX "customer_credentials_customerId_idx" ON "customer_credentials"("customerId");

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_paymentSlipId_fkey" FOREIGN KEY ("paymentSlipId") REFERENCES "payment_slips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_pressers" ADD CONSTRAINT "booking_pressers_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_pressers" ADD CONSTRAINT "booking_pressers_presserId_fkey" FOREIGN KEY ("presserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_pressers" ADD CONSTRAINT "booking_pressers_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booked_tickets" ADD CONSTRAINT "booked_tickets_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booked_tickets" ADD CONSTRAINT "booked_tickets_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booked_tickets" ADD CONSTRAINT "booked_tickets_pressedById_fkey" FOREIGN KEY ("pressedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booked_tickets" ADD CONSTRAINT "booked_tickets_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_credentials" ADD CONSTRAINT "customer_credentials_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_credentials" ADD CONSTRAINT "customer_credentials_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
