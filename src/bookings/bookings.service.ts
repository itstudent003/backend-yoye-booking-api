import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { generateBookingCode } from '../common/utils/generate-booking-code';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookingDto) {
    let bookingCode: string;
    do {
      bookingCode = generateBookingCode();
    } while (await this.prisma.booking.findUnique({ where: { bookingCode } }));

    return this.prisma.booking.create({
      data: { ...dto, bookingCode },
      include: { event: true, customer: true },
    });
  }

  findAll() {
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { event: { select: { id: true, name: true } }, customer: true },
    });
  }

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        customer: true,
        paymentSlips: true,
        fulfillment: true,
        statusLogs: { include: { admin: { select: { id: true, firstName: true, lastName: true } } } },
        billingRecord: true,
        refunds: true,
        deposits: true,
        formSubmission: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(id: number, dto: UpdateBookingDto) {
    await this.findOne(id);
    return this.prisma.booking.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }
}
