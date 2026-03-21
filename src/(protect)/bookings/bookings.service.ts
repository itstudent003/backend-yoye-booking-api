import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { generateBookingCode } from '../common/utils/generate-booking-code';
import { Prisma } from '@prisma/client';

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
          amount: true,
          createdAt: true,
          event: { select: { id: true, name: true, type: true } },
          customer: { select: { id: true, fullName: true } },
          showRound: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true } },
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
      where: { id },
      include: {
        event: { include: { deepInfoFields: true } },
        customer: true,
        paymentSlips: true,
        fulfillment: true,
        statusLogs: { include: { admin: { select: { id: true, firstName: true, lastName: true } } } },
        billingRecord: true,
        refunds: true,
        deposits: true,
        formSubmission: true,
        bookingItems: { include: { round: true, zone: true } },
        deepInfoResponses: { include: { field: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(id: number, dto: UpdateBookingDto) {
    await this.findOne(id);
    const { bookingItems, deepInfoResponses, formData, ...bookingData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Update booking items (replace strategy)
      if (bookingItems) {
        await tx.bookingItem.deleteMany({ where: { bookingId: id } });
        if (bookingItems.length) {
          await tx.bookingItem.createMany({
            data: bookingItems.map((item) => ({
              bookingId: id,
              roundId: item.roundId,
              zoneId: item.zoneId,
              label: item.label,
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? 0,
              totalPrice: (item.unitPrice ?? 0) * item.quantity,
              notes: item.notes,
            })),
          });
        }
      }

      // Update deep info responses (replace strategy)
      if (deepInfoResponses) {
        await tx.deepInfoResponse.deleteMany({ where: { bookingId: id } });
        if (deepInfoResponses.length) {
          await tx.deepInfoResponse.createMany({
            data: deepInfoResponses.map((r) => ({
              bookingId: id,
              fieldId: r.fieldId,
              value: r.value,
            })),
          });
        }
      }

      // Update form submission (upsert)
      if (formData) {
        await tx.formSubmission.upsert({
          where: { bookingId: id },
          create: { bookingId: id, formData },
          update: { formData },
        });
      }

      // Update booking fields
      return tx.booking.update({
        where: { id },
        data: bookingData,
        include: {
          bookingItems: { include: { round: true, zone: true } },
          deepInfoResponses: { include: { field: true } },
          formSubmission: true,
        },
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }
}