import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { BookingStatus, PaymentSlipStatus, PaymentSlipType, Prisma, RefundCategory, RefundStatus } from '@prisma/client';
import { QueryRefundRequestDto } from './dto/query-refund-request.dto';
import { ActivityLogService } from '../common/services/activity-log.service';
import { UpdateStatusRefundRequestDto } from './dto/update-status-refund-request.dto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ACTIVITY_TYPE = {
  REFUND_APPROVED: 'REFUND_APPROVED',
  REFUND_REJECTED: 'REFUND_REJECTED',
  REFUND_PAID: 'REFUND_PAID',
} as const;

const DEPOSIT_STATUS = {
  WAITING_REFUND: 'WAITING_REFUND',
  REFUNDED: 'REFUNDED',
} as const;

const REFUND_CATEGORY = {
  DEPOSIT: 'DEPOSIT',
} as const;

type RefundBreakdown = {
  ticket?: number;
  deposit?: number;
  priceDiff?: number;
  shipping?: number;
  other?: number;
};

const BREAKDOWN_KEYS: Array<keyof RefundBreakdown> = ['ticket', 'deposit', 'priceDiff', 'shipping', 'other'];
const FULL_REFUND_STATUSES: BookingStatus[] = [BookingStatus.BOOKING_FAILED, BookingStatus.TEAM_NOT_RECEIVED];
const PARTIAL_REFUND_STATUSES: BookingStatus[] = [BookingStatus.PARTIALLY_BOOKED, BookingStatus.PARTIAL_SELF_TEAM_BOOKING];
const WAITING_REFUND_STATUSES: BookingStatus[] = [BookingStatus.WAITING_REFUND, BookingStatus.REFUNDED, BookingStatus.CLOSED_REFUNDED];

function normalizeMoney(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function normalizeBreakdown(input?: Record<string, number> | null): RefundBreakdown {
  const breakdown: RefundBreakdown = {};
  for (const key of BREAKDOWN_KEYS) {
    const value = normalizeMoney(input?.[key]);
    if (value > 0) breakdown[key] = value;
  }
  return breakdown;
}

function sumBreakdown(breakdown: RefundBreakdown) {
  return BREAKDOWN_KEYS.reduce((sum, key) => sum + normalizeMoney(breakdown[key]), 0);
}

function categoryFromBreakdown(breakdown: RefundBreakdown): RefundCategory {
  const active = BREAKDOWN_KEYS.filter((key) => normalizeMoney(breakdown[key]) > 0);
  if (active.length !== 1) return RefundCategory.MIXED;
  const [key] = active;
  if (key === 'ticket') return RefundCategory.TICKET;
  if (key === 'deposit') return RefundCategory.DEPOSIT;
  if (key === 'priceDiff') return RefundCategory.PRICE_DIFF;
  if (key === 'shipping') return RefundCategory.SHIPPING;
  return RefundCategory.MIXED;
}

function saveRefundSlipIfBase64(value?: string) {
  if (!value?.startsWith('data:image/')) return value;
  const matches = value.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!matches) return value;
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const uploadPath = join(process.cwd(), 'image', 'upload', 'refunds');
  mkdirSync(uploadPath, { recursive: true });
  const filename = `refund-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  writeFileSync(join(uploadPath, filename), Buffer.from(matches[2], 'base64'));
  return `image/upload/refunds/${filename}`;
}

@Injectable()
export class RefundRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(dto: CreateRefundRequestDto) {
    const { bookingCode, breakdown: rawBreakdown, amount: rawAmount, category, ...rest } = dto;

    const booking = await this.prisma.booking.findUnique({ where: { bookingCode } });
    if (!booking) throw new NotFoundException(`ไม่พบการจองรหัส "${bookingCode}"`);

    const breakdown = normalizeBreakdown(rawBreakdown);
    const breakdownTotal = sumBreakdown(breakdown);
    const amount = breakdownTotal > 0 ? breakdownTotal : normalizeMoney(rawAmount);

    return this.prisma.refundRequest.create({
      data: {
        ...rest,
        amount,
        category: category ?? categoryFromBreakdown(breakdown),
        breakdown: Object.keys(breakdown).length > 0 ? breakdown : undefined,
        bookingId: booking.id,
        bookingRef: booking.bookingCode,
      },
    });
  }

  async suggest(bookingCode: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        event: { select: { id: true, name: true } },
        paymentSlips: {
          where: { status: PaymentSlipStatus.VERIFIED },
          select: { type: true, slipAmount: true },
        },
        deposits: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { usedAmount: true, refundAmount: true, forfeitedAmount: true },
        },
      },
    });
    if (!booking) throw new NotFoundException(`ไม่พบการจองรหัส "${bookingCode}"`);

    const paidByType = (type: PaymentSlipType) =>
      booking.paymentSlips
        .filter((slip) => slip.type === type)
        .reduce((sum, slip) => sum + normalizeMoney(slip.slipAmount), 0);

    const cardPaid = paidByType(PaymentSlipType.CARD_PAID);
    const depositPaid = normalizeMoney(booking.depositPaid);
    const servicePaid = paidByType(PaymentSlipType.SERVICE_PAID);
    const depositTx = booking.deposits[0];
    const depositUsed = normalizeMoney(depositTx?.usedAmount);
    const depositRefund = normalizeMoney(depositTx?.refundAmount);
    const depositForfeited = normalizeMoney(depositTx?.forfeitedAmount);

    let breakdown: RefundBreakdown = {};
    if (FULL_REFUND_STATUSES.includes(booking.status)) {
      breakdown = {
        deposit: depositRefund || depositPaid,
        ticket: cardPaid,
      };
    } else if (PARTIAL_REFUND_STATUSES.includes(booking.status)) {
      breakdown = {
        priceDiff: Math.max(
          normalizeMoney(booking.totalPaid) -
            normalizeMoney(booking.netCardPrice) -
            normalizeMoney(booking.serviceFee) -
            normalizeMoney(booking.shippingFee) +
            depositUsed,
          0,
        ),
      };
    } else if (booking.status === BookingStatus.CANCELLED) {
      breakdown = {
        ticket: cardPaid,
        deposit: depositForfeited > 0 ? 0 : depositRefund,
      };
    } else if (WAITING_REFUND_STATUSES.includes(booking.status)) {
      breakdown = {
        deposit: depositRefund,
        priceDiff: normalizeMoney(booking.refundAmount),
      };
    } else {
      breakdown = {
        ticket: Math.max(cardPaid - normalizeMoney(booking.netCardPrice), 0),
        deposit: depositRefund,
        shipping: Math.max(servicePaid - normalizeMoney(booking.serviceFee), 0),
      };
    }

    breakdown = normalizeBreakdown(breakdown);
    const total = sumBreakdown(breakdown);

    return {
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        nameCustomer: booking.nameCustomer,
        status: booking.status,
        event: booking.event,
      },
      amount: total,
      category: categoryFromBreakdown(breakdown),
      breakdown,
      source: {
        totalPaid: normalizeMoney(booking.totalPaid),
        cardPaid,
        depositPaid,
        depositUsed,
        depositRefund,
        depositForfeited,
        netCardPrice: normalizeMoney(booking.netCardPrice),
        serviceFee: normalizeMoney(booking.serviceFee),
        shippingFee: normalizeMoney(booking.shippingFee),
      },
    };
  }

  async findAll(query: QueryRefundRequestDto) {
    const { page, pageSize, status, eventId, search } = query;
    const isPaginated = page !== undefined && pageSize !== undefined;

    const where: Prisma.RefundRequestWhereInput = {
      ...(status && { status }),
      ...(eventId && { booking: { eventId } }),
      ...(search && {
        booking: {
          OR: [
            { bookingCode: { contains: search, mode: 'insensitive' } },
            { nameCustomer: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const include = {
      booking: {
        select: {
          id: true,
          bookingCode: true,
          nameCustomer: true,
          event: { select: { id: true, name: true } },
        },
      },
      processedBy: { select: { id: true, firstName: true, lastName: true } },
      statusLogs: {
        orderBy: { createdAt: 'desc' as const },
        take: 5,
        select: { id: true, status: true, note: true, createdAt: true },
      },
    };

    if (!isPaginated) {
      const data = await this.prisma.refundRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        include,
      });
      return { data };
    }

    const [data, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include,
      }),
      this.prisma.refundRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        totalCounts: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  findByBooking(bookingId: number) {
    return this.prisma.refundRequest.findMany({
      where: { bookingId },
      orderBy: { requestedAt: 'desc' },
      include: {
        processedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findOne(id: number) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: {
        booking: { select: { id: true, bookingCode: true } },
        processedBy: { select: { id: true, firstName: true, lastName: true } },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, status: true, note: true, createdAt: true },
        },
      },
    });
    if (!refund) throw new NotFoundException('Refund request not found');
    return refund;
  }

  async updateStatus(id: number, dto: UpdateStatusRefundRequestDto, processedById: number) {
    const { status, note, payoutSlipUrl, paidAt, amount, category, breakdown: rawBreakdown, reason, payoutReference } = dto;
    const refund = await this.findOne(id);
    if (refund.status === RefundStatus.PAID || refund.status === RefundStatus.REJECTED) {
      throw new BadRequestException('Refund request is already terminal');
    }
    if (
      refund.status === RefundStatus.REQUESTED &&
      !([RefundStatus.APPROVED, RefundStatus.REJECTED, RefundStatus.PAID] as RefundStatus[]).includes(status)
    ) {
      throw new BadRequestException('REQUESTED can transition only to APPROVED, PAID or REJECTED');
    }
    if (refund.status === RefundStatus.APPROVED && !([RefundStatus.PAID, RefundStatus.REJECTED] as RefundStatus[]).includes(status)) {
      throw new BadRequestException('APPROVED can transition only to PAID or REJECTED');
    }
    if (status === RefundStatus.REJECTED && !note) throw new BadRequestException('rejectionNote is required');
    if (status === RefundStatus.PAID && !payoutSlipUrl) throw new BadRequestException('payoutSlipUrl is required');
    if (status === RefundStatus.PAID && !paidAt) throw new BadRequestException('paidAt is required');

    return this.prisma.$transaction(async (tx) => {
      const actualPaidAt = status === RefundStatus.PAID ? new Date(paidAt as string) : undefined;
      const normalizedBreakdown = rawBreakdown ? normalizeBreakdown(rawBreakdown) : undefined;
      const breakdownTotal = normalizedBreakdown ? sumBreakdown(normalizedBreakdown) : 0;
      const finalAmount = amount !== undefined ? normalizeMoney(amount) : breakdownTotal > 0 ? breakdownTotal : undefined;
      const finalSlipUrl = status === RefundStatus.PAID ? saveRefundSlipIfBase64(payoutSlipUrl) : undefined;
      const finalNote = [note, payoutReference ? `เลขอ้างอิงสลิป: ${payoutReference}` : ''].filter(Boolean).join('\n');
      const updated = await tx.refundRequest.update({
        where: { id },
        data: {
          status,
          processedById,
          processedAt: new Date(),
          amount: finalAmount,
          category,
          breakdown: normalizedBreakdown,
          reason,
          rejectionNote: status === RefundStatus.REJECTED ? finalNote : undefined,
          payoutSlipUrl: finalSlipUrl,
          paidAt: actualPaidAt,
        },
      });
      await tx.refundRequestLog.create({ data: { refundRequestId: id, changedById: processedById, status, note: finalNote || undefined } });

      const updatedCategory = (updated as { category?: string }).category;
      if (status === RefundStatus.PAID && updatedCategory === REFUND_CATEGORY.DEPOSIT) {
        await tx.depositTransaction.updateMany({
          where: { bookingId: updated.bookingId, status: DEPOSIT_STATUS.WAITING_REFUND },
          data: { status: DEPOSIT_STATUS.REFUNDED, decidedAt: new Date() },
        } as unknown as Parameters<typeof tx.depositTransaction.updateMany>[0]);
      }

      let activityType: string = ACTIVITY_TYPE.REFUND_PAID;
      if (status === RefundStatus.APPROVED) activityType = ACTIVITY_TYPE.REFUND_APPROVED;
      if (status === RefundStatus.REJECTED) activityType = ACTIVITY_TYPE.REFUND_REJECTED;

      await this.activityLogService.log(
        {
          actorId: processedById,
          type: activityType,
          bookingId: updated.bookingId,
          entity: 'RefundRequest',
          entityId: id,
          metadata: { status, note: finalNote || null, paidAt: actualPaidAt?.toISOString() ?? null, payoutReference: payoutReference ?? null },
        },
        tx,
      );
      return updated;
    });
  }
}
