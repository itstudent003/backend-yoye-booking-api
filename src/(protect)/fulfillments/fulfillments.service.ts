import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillAction, BookingStatus, FulfillmentType, Prisma } from '@prisma/client';
import { QueryOrdersDto, TRACKING_STATUSES } from './dto/query-orders.dto';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class FulfillmentsService {
  constructor(private prisma: PrismaService) {}

  async findOrders(query: QueryOrdersDto) {
    const { page, pageSize, search, status } = query;
    const isPaginated = page !== undefined && pageSize !== undefined;

    const where: Prisma.BookingWhereInput = {
      status: status ?? { in: [...TRACKING_STATUSES] },
      deletedAt: null,
      ...(search && {
        OR: [
          { bookingCode: { contains: search, mode: 'insensitive' } },
          { nameCustomer: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const select = {
      id: true,
      bookingCode: true,
      nameCustomer: true,
      status: true,
      paymentStatus: true,
      netCardPrice: true,
      serviceFee: true,
      event: { select: { id: true, name: true } },
      fulfillment: {
        select: {
          id: true,
          type: true,
          serviceFee: true,
          shippingFee: true,
          totalCharge: true,
          recipientName: true,
          recipientPhone: true,
          shippingAddress: true,
          deliveryStatus: true,
        },
      },
    };

    if (!isPaginated) {
      const data = await this.prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, select });
      return { data };
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      pagination: { totalCounts: total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async createBill(bookingId: number, adminId: number, dto: CreateBillDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const shippingFee = dto.type === FulfillmentType.ETICKET ? 0 : dto.shippingFee;
    const totalCharge = dto.serviceFee + shippingFee;

    return this.prisma.$transaction(async (tx) => {
      const upserted = await tx.fulfillment.upsert({
        where: { bookingId },
        create: { bookingId, type: dto.type, serviceFee: dto.serviceFee, shippingFee, totalCharge },
        update: { type: dto.type, serviceFee: dto.serviceFee, shippingFee, totalCharge },
      });

      await tx.fulfillmentLog.create({
        data: {
          fulfillmentId: upserted.id,
          adminId,
          action: BillAction.CREATE,
          fulfillmentType: dto.type,
          serviceFee: dto.serviceFee,
          shippingFee,
          vatAmount: 0,
          totalCharge,
          note: dto.note,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.WAITING_SERVICE_FEE_VERIFY },
      });

      await tx.bookingStatusLog.create({
        data: { bookingId, changedBy: adminId, status: BookingStatus.WAITING_SERVICE_FEE_VERIFY, notes: dto.note },
      });

      return upserted;
    });
  }

  async updateBill(bookingId: number, adminId: number, dto: CreateBillDto) {
    const fulfillment = await this.prisma.fulfillment.findUnique({ where: { bookingId } });
    if (!fulfillment) throw new NotFoundException('Bill not found for this booking');

    const shippingFee = dto.type === FulfillmentType.ETICKET ? 0 : dto.shippingFee;
    const totalCharge = dto.serviceFee + shippingFee;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fulfillment.update({
        where: { bookingId },
        data: { type: dto.type, serviceFee: dto.serviceFee, shippingFee, totalCharge },
      });

      await tx.fulfillmentLog.create({
        data: {
          fulfillmentId: fulfillment.id,
          adminId,
          action: BillAction.EDIT,
          fulfillmentType: dto.type,
          serviceFee: dto.serviceFee,
          shippingFee,
          vatAmount: 0,
          totalCharge,
          note: dto.note,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.WAITING_SERVICE_FEE_VERIFY },
      });

      await tx.bookingStatusLog.create({
        data: { bookingId, changedBy: adminId, status: BookingStatus.WAITING_SERVICE_FEE_VERIFY, notes: dto.note },
      });

      return updated;
    });
  }

  async updateOrderStatus(bookingId: number, adminId: number, dto: UpdateOrderStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: bookingId }, data: { status: dto.status } }),
      this.prisma.bookingStatusLog.create({
        data: { bookingId, changedBy: adminId, status: dto.status, notes: dto.note },
      }),
    ]);

    return updated;
  }

  async getBillHistory(bookingId: number) {
    const fulfillment = await this.prisma.fulfillment.findUnique({ where: { bookingId } });
    if (!fulfillment) throw new NotFoundException('Bill not found for this booking');

    return this.prisma.fulfillmentLog.findMany({
      where: { fulfillmentId: fulfillment.id },
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}