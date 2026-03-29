import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentSlipDto } from './dto/create-payment-slip.dto';
import { QueryPaymentSlipDto } from './dto/query-payment-slip.dto';
import { PaymentSlipStatus, Prisma } from '@prisma/client';

@Injectable()
export class PaymentSlipsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreatePaymentSlipDto) {
    return this.prisma.paymentSlip.create({ data: dto });
  }

  async findAll(query: QueryPaymentSlipDto) {
    const { page = 1, pageSize = 10, type, status, eventId, search } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentSlipWhereInput = {
      ...(type && { type }),
      ...(status && { status }),
      ...(eventId && { booking: { eventId } }),
      ...(search && {
        booking: {
          OR: [
            { bookingCode: { contains: search, mode: 'insensitive' as const } },
            { nameCustomer: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.paymentSlip.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          booking: {
            select: {
              id: true,
              bookingCode: true,
              nameCustomer: true,
              status: true,
              paymentStatus: true,
              netCardPrice: true,
              totalPaid: true,
              event: { select: { id: true, name: true } },
              customer: { select: { id: true, fullName: true, phone: true } },
            },
          },
          reviewer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.paymentSlip.count({ where }),
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
    return this.prisma.paymentSlip.findMany({ where: { bookingId } });
  }

  async findOne(id: number) {
    const slip = await this.prisma.paymentSlip.findUnique({ where: { id } });
    if (!slip) throw new NotFoundException('Payment slip not found');
    return slip;
  }

  async verify(id: number, reviewerId: number) {
    await this.findOne(id);
    const [updated] = await this.prisma.$transaction([
      this.prisma.paymentSlip.update({
        where: { id },
        data: { status: PaymentSlipStatus.VERIFIED, reviewerId, reviewedAt: new Date() },
      }),
      this.prisma.paymentSlipLog.create({
        data: { paymentSlipId: id, changedById: reviewerId, status: PaymentSlipStatus.VERIFIED },
      }),
    ]);
    return updated;
  }

  async reject(id: number, reviewerId: number, notes?: string) {
    await this.findOne(id);
    const [updated] = await this.prisma.$transaction([
      this.prisma.paymentSlip.update({
        where: { id },
        data: { status: PaymentSlipStatus.REJECTED, reviewerId, reviewedAt: new Date(), notes },
      }),
      this.prisma.paymentSlipLog.create({
        data: { paymentSlipId: id, changedById: reviewerId, status: PaymentSlipStatus.REJECTED, note: notes },
      }),
    ]);
    return updated;
  }
}
