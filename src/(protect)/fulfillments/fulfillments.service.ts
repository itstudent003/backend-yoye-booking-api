import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateFulfillmentDto } from './dto/update-fulfillment.dto';
import { FulfillmentType } from '@prisma/client';

@Injectable()
export class FulfillmentsService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdate(bookingId: number, dto: UpdateFulfillmentDto) {
    return this.prisma.fulfillment.upsert({
      where: { bookingId },
      update: dto,
      create: { bookingId, type: dto.type ?? FulfillmentType.ETICKET, ...dto },
    });
  }

  async findByBooking(bookingId: number) {
    const fulfillment = await this.prisma.fulfillment.findUnique({ where: { bookingId } });
    if (!fulfillment) throw new NotFoundException('Fulfillment not found');
    return fulfillment;
  }

  async update(bookingId: number, dto: UpdateFulfillmentDto) {
    return this.prisma.fulfillment.update({ where: { bookingId }, data: dto });
  }
}
