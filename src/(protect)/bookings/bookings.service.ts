import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { generateBookingCode } from '../common/utils/generate-booking-code';
import { Prisma } from '@prisma/client';

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
}

function fullName(user: AuthUser) {
  return `${user.firstName} ${user.lastName}`;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookingDto) {
    const { bookingItems, deepInfoResponses, formData, ...bookingData } = dto;

    let bookingCode: string;
    do {
      bookingCode = generateBookingCode();
    } while (await this.prisma.booking.findUnique({ where: { bookingCode } }));

    return this.prisma.booking.create({
      data: {
        ...bookingData,
        bookingCode,
        ...(bookingItems?.length && {
          bookingItems: {
            create: bookingItems.map((item) => ({
              roundId: item.roundId,
              zoneId: item.zoneId,
              label: item.label,
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? 0,
              totalPrice: (item.unitPrice ?? 0) * item.quantity,
              notes: item.notes,
            })),
          },
        }),
        ...(deepInfoResponses?.length && {
          deepInfoResponses: {
            create: deepInfoResponses.map((r) => ({
              fieldId: r.fieldId,
              value: r.value,
            })),
          },
        }),
        ...(formData && {
          formSubmission: {
            create: { formData },
          },
        }),
      },
      include: {
        event: true,
        customer: true,
        bookingItems: { include: { round: true, zone: true } },
        deepInfoResponses: { include: { field: true } },
        formSubmission: true,
      },
    });
  }

  async findAll(query: QueryBookingDto) {
    const { page = 1, pageSize= 20, search, eventId, status } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(status && { status }),
      ...(eventId && { eventId }),
      ...(search && {
        OR: [
          { queueCode: { contains: search, mode: 'insensitive' as const } },
          { bookingCode: { contains: search, mode: 'insensitive' as const } },
          { customer: { fullName: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          queueCode: true,
          bookingCode: true,
          status: true,
          nameCustomer: true,
          depositPaid: true,
          createdAt: true,
          event: { select: { id: true, name: true, type: true } },
          customer: { select: { id: true, fullName: true } },
          bookingItems: {
            select: {
              round: { select: { id: true, name: true } },
              zone: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
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

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id, deletedAt: null, isActive: true },
      select: {
        id: true,
        queueCode: true,
        bookingCode: true,
        status: true,
        paymentStatus: true,
        nameCustomer: true,
        netCardPrice: true,
        serviceFee: true,
        shippingFee: true,
        vatAmount: true,
        depositPaid: true,
        totalPaid: true,
        refundAmount: true,
        notes: true,
        createdAt: true,
        createdBy: true,
        updatedAt: true,
        updatedBy: true,
        event: { select: { id: true, name: true, type: true } },
        customer: { select: { id: true, fullName: true, nickname: true, phone: true, lineId: true } },
        bookingItems: { include: { round: true, zone: true } },
        deepInfoResponses: { include: { field: true } },
        formSubmission: true,
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          include: { admin: { select: { id: true, firstName: true, lastName: true } } },
        },
        paymentSlips: {
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(id: number, dto: UpdateBookingDto, user: AuthUser) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id },
        data: {
          ...dto,
          updatedBy: fullName(user),
        },
      });

      if (dto.status) {
        await tx.bookingStatusLog.create({
          data: {
            bookingId: id,
            changedBy: user.id,
            status: dto.status,
            notes: dto.notes,
          },
        });
      }

      return booking;
    });
  }

  async remove(id: number, user: AuthUser) {
    await this.findOne(id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: fullName(user),
      },
    });
  }
}