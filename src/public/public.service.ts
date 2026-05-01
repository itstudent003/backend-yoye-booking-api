import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefundRequestDto } from '../(protect)/refund-requests/dto/create-refund-request.dto';
import { BookingStatus, PaymentSlipStatus, PaymentSlipType, RefundCategory, RefundStatus } from '@prisma/client';

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

const FULL_REFUND_STATUSES: BookingStatus[] = [BookingStatus.BOOKING_FAILED, BookingStatus.TEAM_NOT_RECEIVED];
const PARTIAL_REFUND_STATUSES: BookingStatus[] = [BookingStatus.PARTIALLY_BOOKED, BookingStatus.PARTIAL_SELF_TEAM_BOOKING];
const CARD_RETURN_STATUSES: BookingStatus[] = [BookingStatus.BOOKING_FAILED, BookingStatus.TEAM_NOT_RECEIVED, BookingStatus.CANCELLED];

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
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: dto.bookingCode },
      include: {
        customer: true,
        paymentSlips: { where: { status: PaymentSlipStatus.VERIFIED }, select: { type: true, slipAmount: true } },
        deposits: { orderBy: { createdAt: 'desc' }, take: 1, select: { refundAmount: true, usedAmount: true, forfeitedAmount: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const phone = booking.customer.phone ?? '';
    if (!phone.endsWith(dto.phoneLast4)) throw new ForbiddenException('Invalid booking verification');

    const cardPaid = booking.paymentSlips
      .filter((slip) => slip.type === PaymentSlipType.CARD_PAID)
      .reduce((sum, slip) => sum + money(slip.slipAmount), 0);
    const depositTx = booking.deposits[0];
    const depositRefund = money(depositTx?.refundAmount) || (
      FULL_REFUND_STATUSES.includes(booking.status)
        ? money(booking.depositPaid)
        : 0
    );
    const priceDiff = PARTIAL_REFUND_STATUSES.includes(booking.status)
      ? Math.max(money(booking.totalPaid) - money(booking.netCardPrice) - money(booking.serviceFee) - money(booking.shippingFee) + money(depositTx?.usedAmount), 0)
      : money(booking.refundAmount);
    const breakdown = dto.breakdown ?? {
      ticket: CARD_RETURN_STATUSES.includes(booking.status) ? cardPaid : 0,
      deposit: booking.status === BookingStatus.CANCELLED && money(depositTx?.forfeitedAmount) > 0 ? 0 : depositRefund,
      priceDiff,
    };
    const amount = dto.amount ?? Object.values(breakdown).reduce((sum, value) => sum + money(value), 0);

    return this.prisma.refundRequest.create({
      data: {
        bookingId: booking.id,
        bookingRef: booking.bookingCode,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
        amount,
        reason: dto.reason,
        category: dto.category ?? RefundCategory.MIXED,
        breakdown,
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

  async updateRejectedRefundAccount(
    id: number,
    dto: { phoneLast4: string; bankName: string; accountNumber: string; accountHolder: string; note?: string },
  ) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: { booking: { include: { customer: true } } },
    });
    if (!refund) throw new NotFoundException('Refund request not found');
    const phone = refund.booking.customer.phone ?? '';
    if (!phone.endsWith(dto.phoneLast4)) throw new ForbiddenException('Invalid booking verification');
    if (refund.status !== RefundStatus.REJECTED) {
      throw new BadRequestException('Only rejected refund requests can be edited by customer');
    }

    return this.prisma.refundRequest.update({
      where: { id },
      data: {
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
        reason: dto.note ? `${refund.reason ?? ''}\nแก้ไขบัญชี: ${dto.note}`.trim() : refund.reason,
        status: RefundStatus.REQUESTED,
        rejectionNote: null,
        processedById: null,
        processedAt: null,
      },
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        bankName: true,
        accountNumber: true,
        accountHolder: true,
        requestedAt: true,
      },
    });
  }
}
