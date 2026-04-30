import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { Prisma, RefundStatus } from '@prisma/client';
import { QueryRefundRequestDto } from './dto/query-refund-request.dto';
import { ActivityLogService } from '../common/services/activity-log.service';

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

@Injectable()
export class RefundRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(dto: CreateRefundRequestDto) {
    const { bookingCode, ...rest } = dto;

    const booking = await this.prisma.booking.findUnique({ where: { bookingCode } });
    if (!booking) throw new NotFoundException(`ไม่พบการจองรหัส "${bookingCode}"`);

    return this.prisma.refundRequest.create({
      data: { ...rest, bookingId: booking.id, bookingRef: booking.bookingCode },
    });
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
      },
    });
    if (!refund) throw new NotFoundException('Refund request not found');
    return refund;
  }

  async updateStatus(id: number, status: RefundStatus, processedById: number, note?: string, payoutSlipUrl?: string) {
    const refund = await this.findOne(id);
    if (refund.status === RefundStatus.PAID || refund.status === RefundStatus.REJECTED) {
      throw new BadRequestException('Refund request is already terminal');
    }
    if (refund.status === RefundStatus.REQUESTED && !([RefundStatus.APPROVED, RefundStatus.REJECTED] as RefundStatus[]).includes(status)) {
      throw new BadRequestException('REQUESTED can transition only to APPROVED or REJECTED');
    }
    if (refund.status === RefundStatus.APPROVED && !([RefundStatus.PAID, RefundStatus.REJECTED] as RefundStatus[]).includes(status)) {
      throw new BadRequestException('APPROVED can transition only to PAID or REJECTED');
    }
    if (status === RefundStatus.REJECTED && !note) throw new BadRequestException('rejectionNote is required');
    if (status === RefundStatus.PAID && !payoutSlipUrl) throw new BadRequestException('payoutSlipUrl is required');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.refundRequest.update({
        where: { id },
        data: {
          status,
          processedById,
          processedAt: new Date(),
          rejectionNote: status === RefundStatus.REJECTED ? note : undefined,
          payoutSlipUrl: status === RefundStatus.PAID ? payoutSlipUrl : undefined,
          paidAt: status === RefundStatus.PAID ? new Date() : undefined,
        },
      });
      await tx.refundRequestLog.create({ data: { refundRequestId: id, changedById: processedById, status, note } });

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
          metadata: { status, note: note ?? null },
        },
        tx,
      );
      return updated;
    });
  }
}
