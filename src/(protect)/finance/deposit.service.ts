import { Injectable } from '@nestjs/common';
import { BookingStatus, DepositReason, DepositStatus, DepositTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const REFUND_STATUSES = new Set<BookingStatus>([
  BookingStatus.BOOKING_FAILED,
  BookingStatus.TEAM_NOT_RECEIVED,
]);

@Injectable()
export class DepositService {
  constructor(private prisma: PrismaService) {}

  async recompute(bookingId: number, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    const booking = await client.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, eventId: true, status: true, depositPaid: true },
    });
    if (!booking || booking.depositPaid <= 0) return null;

    const ticketAgg = await client.bookedTicket.aggregate({
      _sum: { price: true },
      where: { bookingId, voidedAt: null },
    });
    const ticketAmount = Number(ticketAgg._sum.price ?? 0);
    const depositAmount = booking.depositPaid;

    let status: DepositStatus = DepositStatus.DEPOSIT_PENDING;
    let reason: DepositReason = DepositReason.ADMIN_OVERRIDE;
    let usedAmount = 0;
    let refundAmount = 0;
    let forfeitedAmount = 0;

    if (booking.status === BookingStatus.CANCELLED) {
      status = DepositStatus.DEPOSIT_FORFEITED;
      reason = DepositReason.CUSTOMER_CANCEL;
      forfeitedAmount = depositAmount;
    } else if (REFUND_STATUSES.has(booking.status)) {
      status = DepositStatus.WAITING_REFUND;
      reason = DepositReason.PRESS_FAILED;
      refundAmount = depositAmount;
    } else if (booking.status === BookingStatus.CUSTOMER_SELF_BOOKED) {
      status = DepositStatus.WAITING_REFUND;
      reason = DepositReason.CUSTOMER_SELF_BOOKED;
      refundAmount = depositAmount;
    } else if (booking.status === BookingStatus.FULLY_BOOKED || booking.status === BookingStatus.PARTIALLY_BOOKED) {
      status = ticketAmount >= depositAmount ? DepositStatus.DEPOSIT_USED : DepositStatus.WAITING_REFUND;
      reason = DepositReason.PRESS_SUCCESS;
      usedAmount = Math.min(ticketAmount, depositAmount);
      refundAmount = Math.max(depositAmount - ticketAmount, 0);
    }

    const existing = await client.depositTransaction.findFirst({
      where: { bookingId, status: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    const data = {
      bookingId,
      eventId: booking.eventId,
      type: DepositTransactionType.HELD,
      amount: depositAmount,
      status,
      usedAmount,
      refundAmount,
      forfeitedAmount,
      reason,
      decidedAt: new Date(),
    };

    return existing
      ? client.depositTransaction.update({ where: { id: existing.id }, data })
      : client.depositTransaction.create({ data });
  }
}
