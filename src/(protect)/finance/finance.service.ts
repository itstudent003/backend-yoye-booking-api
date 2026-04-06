import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, PaymentSlipType, Prisma, RefundStatus } from '@prisma/client';
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
    const [totalAgg, usedAgg, forfeitedAgg, refundedAgg] = await Promise.all([
      this.prisma.booking.aggregate({
        _sum: { depositPaid: true },
        where: { status: { in: DEPOSIT_STATUSES }, deletedAt: null },
      }),
      this.prisma.booking.aggregate({
        _sum: { depositPaid: true },
        where: { status: BookingStatus.DEPOSIT_USED, deletedAt: null },
      }),
      this.prisma.booking.aggregate({
        _sum: { depositPaid: true },
        where: { status: BookingStatus.DEPOSIT_FORFEITED, deletedAt: null },
      }),
      this.prisma.refundRequest.aggregate({
        _sum: { amount: true },
        where: { status: RefundStatus.PAID },
      }),
    ]);

    return {
      totalDeposit: totalAgg._sum.depositPaid ?? 0,
      usedAsFee: usedAgg._sum.depositPaid ?? 0,
      forfeited: forfeitedAgg._sum.depositPaid ?? 0,
      refunded: refundedAgg._sum.amount ?? 0,
    };
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
