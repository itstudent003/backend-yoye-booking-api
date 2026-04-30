import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefundRequestDto } from '../(protect)/refund-requests/dto/create-refund-request.dto';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  private async getVerifiedBooking(bookingCode: string, phoneLast4: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: { customer: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const phone = booking.customer.phone ?? '';
    if (!phone.endsWith(phoneLast4)) throw new ForbiddenException('Invalid booking verification');
    return booking;
  }

  async getTickets(bookingCode: string, phoneLast4: string) {
    const booking = await this.getVerifiedBooking(bookingCode, phoneLast4);
    return this.prisma.bookedTicket.findMany({
      where: { bookingId: booking.id, voidedAt: null },
      orderBy: { pressedAt: 'desc' },
      include: { zone: true },
    });
  }

  async createRefundRequest(dto: CreateRefundRequestDto & { phoneLast4: string }) {
    const booking = await this.getVerifiedBooking(dto.bookingCode, dto.phoneLast4);
    return this.prisma.refundRequest.create({
      data: {
        bookingId: booking.id,
        bookingRef: booking.bookingCode,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
        amount: dto.amount,
        reason: dto.reason,
        category: dto.category,
        breakdown: dto.breakdown,
      },
    });
  }

  async getRefundRequests(bookingCode: string, phoneLast4: string) {
    const booking = await this.getVerifiedBooking(bookingCode, phoneLast4);
    return this.prisma.refundRequest.findMany({
      where: { bookingId: booking.id },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        category: true,
        breakdown: true,
        rejectionNote: true,
        payoutSlipUrl: true,
        paidAt: true,
        requestedAt: true,
        processedAt: true,
      },
    });
  }
}
