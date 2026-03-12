-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('TICKET', 'FORM');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('CONCERT', 'PRODUCT_PREORDER', 'FAN_MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_APPROVAL', 'IN_PROGRESS', 'READY_FOR_FULFILLMENT', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentSlipType" AS ENUM ('DEPOSIT', 'TICKET', 'PRODUCT', 'SERVICE_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentSlipStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('ETICKET', 'PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('NOT_STARTED', 'WAITING_PICKUP', 'READY_FOR_PICKUP', 'PICKED_UP', 'WAITING_DELIVERY', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DepositTransactionType" AS ENUM ('HELD', 'USED', 'FORFEITED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "InsightMode" AS ENUM ('TICKET', 'FORM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "line" TEXT,
    "phone" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "lineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "category" "EventCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "posterUrl" TEXT,
    "remarks" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceFee" DOUBLE PRECISION,
    "depositRate" DOUBLE PRECISION,
    "serviceFeeFixed" DOUBLE PRECISION,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_showtimes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "capacity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_showtimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_zones" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "showtimeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "serviceFee" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "remainingCap" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ticket_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_custom_fields" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mode" "InsightMode" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_insights" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "queueCode" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedAdminId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_slips" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "type" "PaymentSlipType" NOT NULL,
    "status" "PaymentSlipStatus" NOT NULL DEFAULT 'PENDING',
    "systemAmount" DOUBLE PRECISION NOT NULL,
    "slipAmount" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_slips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_records" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.07,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_transactions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "eventId" TEXT,
    "type" "DepositTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentSlipId" TEXT,
    "processedById" TEXT,
    "nickname" TEXT,
    "bookingRef" TEXT,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT,
    "accountHolder" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "FulfillmentType" NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "pickupDateTime" TIMESTAMP(3),
    "pickupLocation" TEXT,
    "qrCode" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingPostal" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "trackingNumber" TEXT,
    "shippingFee" DOUBLE PRECISION DEFAULT 0,
    "serviceFee" DOUBLE PRECISION DEFAULT 0,
    "vatAmount" DOUBLE PRECISION DEFAULT 0,
    "totalCharge" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfillments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_logs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_queueCode_key" ON "bookings"("queueCode");

-- CreateIndex
CREATE UNIQUE INDEX "billing_records_bookingId_key" ON "billing_records"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_records_billNumber_key" ON "billing_records"("billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillments_bookingId_key" ON "fulfillments"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_bookingId_key" ON "form_submissions"("bookingId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_showtimes" ADD CONSTRAINT "event_showtimes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_zones" ADD CONSTRAINT "ticket_zones_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_zones" ADD CONSTRAINT "ticket_zones_showtimeId_fkey" FOREIGN KEY ("showtimeId") REFERENCES "event_showtimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_custom_fields" ADD CONSTRAINT "event_custom_fields_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_insights" ADD CONSTRAINT "event_insights_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_paymentSlipId_fkey" FOREIGN KEY ("paymentSlipId") REFERENCES "payment_slips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_logs" ADD CONSTRAINT "booking_status_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_logs" ADD CONSTRAINT "booking_status_logs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
