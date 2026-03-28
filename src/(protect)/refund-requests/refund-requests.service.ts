import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { Prisma, RefundStatus } from '@prisma/client';
import { QueryRefundRequestDto } from './dto/query-refund-request.dto';

@Injectable()
export class RefundRequestsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRefundRequestDto) {
    return this.prisma.refundRequest.create({ data: dto });
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
            { queueCode: { contains: search, mode: 'insensitive' } },
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
          queueCode: true,
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
        booking: { select: { id: true, queueCode: true, bookingCode: true } },
        processedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!refund) throw new NotFoundException('Refund request not found');
    return refund;
  }

  async updateStatus(id: number, status: RefundStatus, processedById: number, note?: string) {
    await this.findOne(id);
    const [updated] = await this.prisma.$transaction([
      this.prisma.refundRequest.update({
        where: { id },
        data: { status, processedById, processedAt: new Date() },
      }),
      this.prisma.refundRequestLog.create({
        data: { refundRequestId: id, changedById: processedById, status, note },
      }),
    ]);
    return updated;
  }
}