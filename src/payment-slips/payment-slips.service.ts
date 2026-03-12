import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentSlipDto } from './dto/create-payment-slip.dto';
import { PaymentSlipStatus } from '@prisma/client';

@Injectable()
export class PaymentSlipsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreatePaymentSlipDto) {
    return this.prisma.paymentSlip.create({ data: dto });
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
    return this.prisma.paymentSlip.update({
      where: { id },
      data: { status: PaymentSlipStatus.VERIFIED, reviewerId, reviewedAt: new Date() },
    });
  }

  async reject(id: number, reviewerId: number, notes?: string) {
    await this.findOne(id);
    return this.prisma.paymentSlip.update({
      where: { id },
      data: { status: PaymentSlipStatus.REJECTED, reviewerId, reviewedAt: new Date(), notes },
    });
  }
}
