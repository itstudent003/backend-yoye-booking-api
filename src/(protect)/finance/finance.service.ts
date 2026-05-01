import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, DepositReason, DepositStatus, DepositTransactionType, PaymentSlipStatus, PaymentSlipType, Prisma, RefundStatus } from '@prisma/client';

const DEPOSIT_TO_BOOKING_STATUS: Record<DepositStatus, BookingStatus> = {
  [DepositStatus.DEPOSIT_PENDING]: BookingStatus.DEPOSIT_PENDING,
  [DepositStatus.DEPOSIT_USED]: BookingStatus.DEPOSIT_USED,
  [DepositStatus.DEPOSIT_FORFEITED]: BookingStatus.DEPOSIT_FORFEITED,
  [DepositStatus.WAITING_REFUND]: BookingStatus.WAITING_REFUND,
  [DepositStatus.REFUNDED]: BookingStatus.REFUNDED,
};
import { QueryFinanceDepositsDto } from './dto/query-finance-deposits.dto';
import { QueryFinanceFeesDto } from './dto/query-finance-fees.dto';
import { QueryFinanceRefundsDto } from './dto/query-finance-refunds.dto';

const DEPOSIT_STATUSES = [
  BookingStatus.DEPOSIT_PENDING,
  BookingStatus.DEPOSIT_USED,
  BookingStatus.DEPOSIT_FORFEITED,
  BookingStatus.WAITING_REFUND,
  BookingStatus.REFUNDED,
];

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [totalAgg, usedAgg, forfeitedAgg, refundedAgg, pendingRefundAgg, pendingRefundCount, outstandingPaymentAgg, outstandingPaymentCount] = await Promise.all([
      this.prisma.depositTransaction.aggregate({
        _sum: { amount: true },
        where: { status: { not: null } },
      }),
      this.prisma.depositTransaction.aggregate({
        _sum: { usedAmount: true },
        where: { status: DepositStatus.DEPOSIT_USED },
      }),
      this.prisma.depositTransaction.aggregate({
        _sum: { forfeitedAmount: true },
        where: { status: DepositStatus.DEPOSIT_FORFEITED },
      }),
      this.prisma.refundRequest.aggregate({
        _sum: { amount: true },
        where: { status: RefundStatus.PAID },
      }),
      this.prisma.refundRequest.aggregate({
        _sum: { amount: true },
        where: { status: RefundStatus.APPROVED },
      }),
      this.prisma.refundRequest.count({ where: { status: RefundStatus.APPROVED } }),
      this.prisma.paymentSlip.aggregate({
        _sum: { slipAmount: true },
        where: { status: PaymentSlipStatus.PENDING },
      }),
      this.prisma.paymentSlip.count({ where: { status: PaymentSlipStatus.PENDING } }),
    ]);

    return {
      totalDeposit: totalAgg._sum.amount ?? 0,
      usedAsFee: usedAgg._sum.usedAmount ?? 0,
      forfeited: forfeitedAgg._sum.forfeitedAmount ?? 0,
      refunded: refundedAgg._sum.amount ?? 0,
      pendingRefundAmount: pendingRefundAgg._sum.amount ?? 0,
      pendingRefundCount,
      outstandingPaymentAmount: outstandingPaymentAgg._sum.slipAmount ?? 0,
      outstandingPaymentCount,
    };
  }

  getDepositByBooking(bookingId: number) {
    return this.prisma.depositTransaction.findFirst({
      where: { bookingId, status: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { booking: { select: { bookingCode: true, nameCustomer: true, status: true } }, decidedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async overrideDeposit(bookingId: number, data: { status: DepositStatus; usedAmount?: number; refundAmount?: number; forfeitedAmount?: number; reasonNotes?: string }, userId: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return null;

    const nextBookingStatus = DEPOSIT_TO_BOOKING_STATUS[data.status];

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.depositTransaction.findFirst({
        where: { bookingId, status: { not: null } },
        orderBy: { createdAt: 'desc' },
      });

      const payload = {
        bookingId,
        eventId: booking.eventId,
        type: DepositTransactionType.HELD,
        amount: booking.depositPaid,
        status: data.status,
        usedAmount: data.usedAmount ?? 0,
        refundAmount: data.refundAmount ?? 0,
        forfeitedAmount: data.forfeitedAmount ?? 0,
        reason: DepositReason.ADMIN_OVERRIDE,
        reasonNotes: data.reasonNotes,
        decidedById: userId,
        decidedAt: new Date(),
      };

      const transaction = existing
        ? await tx.depositTransaction.update({ where: { id: existing.id }, data: payload })
        : await tx.depositTransaction.create({ data: payload });

      // Sync booking.status so that the deposit status badge in lists reflects the change
      if (nextBookingStatus && booking.status !== nextBookingStatus) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: nextBookingStatus },
        });

        await tx.bookingStatusLog.create({
          data: {
            bookingId,
            changedBy: userId,
            status: nextBookingStatus,
            notes: data.reasonNotes ?? 'Deposit override',
          },
        });
      }

      return transaction;
    });
  }

  async getDeposits(query: QueryFinanceDepositsDto) {
    const { page = 1, pageSize = 10, status = 'ALL', search } = query;
    const skip = (page - 1) * pageSize;
    const statusFilter =
      status && status !== 'ALL'
        ? { status: status as BookingStatus }
        : { status: { in: DEPOSIT_STATUSES } };

    const searchId = search && /^\d+$/.test(search) ? parseInt(search) : undefined;
    const where: Prisma.BookingWhereInput = {
      ...statusFilter,
      deletedAt: null,
      ...(search && {
        OR: [
          ...(searchId ? [{ id: searchId }] : []),
          { bookingCode: { contains: search, mode: 'insensitive' as const } },
          { nameCustomer: { contains: search, mode: 'insensitive' as const } },
          { event: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          bookingCode: true,
          nameCustomer: true,
          depositPaid: true,
          status: true,
          updatedAt: true,
          event: { select: { name: true } },
          customer: { select: { fullName: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        customer: b.nameCustomer ?? b.customer?.fullName ?? null,
        event: b.event?.name ?? null,
        amount: b.depositPaid,
        date: b.updatedAt,
        status: b.status,
      })),
      pagination: {
        totalCounts: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getFees(query: QueryFinanceFeesDto) {
    const { page = 1, pageSize = 10, search } = query;
    const skip = (page - 1) * pageSize;
    const where: Prisma.PaymentSlipWhereInput = {
      type: { in: [PaymentSlipType.CARD_PAID, PaymentSlipType.SERVICE_PAID] },
      status: 'VERIFIED',
      ...(search && {
        booking: {
          OR: [
            { bookingCode: { contains: search, mode: 'insensitive' as const } },
            { nameCustomer: { contains: search, mode: 'insensitive' as const } },
            { event: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        },
      }),
    };

    const [slips, total] = await Promise.all([
      this.prisma.paymentSlip.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          booking: {
            select: { event: { select: { name: true } } },
          },
        },
      }),
      this.prisma.paymentSlip.count({ where }),
    ]);

    return {
      data: slips.map((s) => ({
        id: s.id,
        description:
          s.type === PaymentSlipType.CARD_PAID
            ? `ค่าบัตร ${s.booking?.event?.name ?? ''}`
            : `ค่ากด ${s.booking?.event?.name ?? ''}`,
        amount: s.slipAmount,
        date: s.createdAt,
        type: s.type === PaymentSlipType.CARD_PAID ? 'TICKET' : 'HANDLING',
      })),
      pagination: {
        totalCounts: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getRefunds(query: QueryFinanceRefundsDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;
    const where: Prisma.RefundRequestWhereInput = { status: RefundStatus.PAID };

    const [refunds, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        orderBy: { processedAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          booking: {
            select: { customer: { select: { fullName: true } } },
          },
        },
      }),
      this.prisma.refundRequest.count({ where }),
    ]);

    return {
      data: refunds.map((r) => ({
        id: r.id,
        customer: r.booking?.customer?.fullName ?? null,
        amount: r.amount,
        reason: r.reason,
        date: r.processedAt ?? r.requestedAt,
      })),
      pagination: {
        totalCounts: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
