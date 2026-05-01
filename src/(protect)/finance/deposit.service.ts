import { Injectable } from '@nestjs/common';
import { BookingStatus, DepositReason, DepositStatus, DepositTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const REFUND_STATUSES = new Set<BookingStatus>([
  BookingStatus.BOOKING_FAILED,
  BookingStatus.TEAM_NOT_RECEIVED,
]);

const DEPOSIT_TO_BOOKING_STATUS: Record<DepositStatus, BookingStatus> = {
  [DepositStatus.DEPOSIT_PENDING]: BookingStatus.DEPOSIT_PENDING,
  [DepositStatus.DEPOSIT_USED]: BookingStatus.DEPOSIT_USED,
  [DepositStatus.DEPOSIT_FORFEITED]: BookingStatus.DEPOSIT_FORFEITED,
  [DepositStatus.WAITING_REFUND]: BookingStatus.WAITING_REFUND,
  [DepositStatus.REFUNDED]: BookingStatus.REFUNDED,
};

const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  [DepositStatus.DEPOSIT_PENDING]: 'ถือมัดจำไว้ก่อน',
  [DepositStatus.DEPOSIT_USED]: 'ใช้มัดจำเป็นค่ากด',
  [DepositStatus.DEPOSIT_FORFEITED]: 'ยึดมัดจำ',
  [DepositStatus.WAITING_REFUND]: 'รอคืนมัดจำ',
  [DepositStatus.REFUNDED]: 'คืนมัดจำแล้ว',
};

const getAutoDepositStatusNote = (status: DepositStatus) =>
  `ระบบปรับสถานะมัดจำเป็น: ${DEPOSIT_STATUS_LABELS[status]}`;

@Injectable()
export class DepositService {
  constructor(private prisma: PrismaService) {}

  async recompute(
    bookingId: number,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
    changedBy?: number,
    sourceStatus?: BookingStatus,
  ) {
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

    const bookingStatus = sourceStatus ?? booking.status;

    if (bookingStatus === BookingStatus.CANCELLED) {
      status = DepositStatus.DEPOSIT_FORFEITED;
      reason = DepositReason.CUSTOMER_CANCEL;
      forfeitedAmount = depositAmount;
    } else if (REFUND_STATUSES.has(bookingStatus)) {
      status = DepositStatus.WAITING_REFUND;
      reason = DepositReason.PRESS_FAILED;
      refundAmount = depositAmount;
    } else if (bookingStatus === BookingStatus.CUSTOMER_SELF_BOOKED) {
      status = DepositStatus.DEPOSIT_FORFEITED;
      reason = DepositReason.CUSTOMER_SELF_BOOKED;
      forfeitedAmount = depositAmount;
    } else if (bookingStatus === BookingStatus.PARTIALLY_BOOKED) {
      return null;
    } else if (bookingStatus === BookingStatus.FULLY_BOOKED) {
      status = DepositStatus.DEPOSIT_USED;
      reason = DepositReason.PRESS_SUCCESS;
      usedAmount = ticketAmount > 0 ? Math.min(ticketAmount, depositAmount) : depositAmount;
      refundAmount = ticketAmount > 0 ? Math.max(depositAmount - ticketAmount, 0) : 0;
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

    const transaction = await (existing
      ? client.depositTransaction.update({ where: { id: existing.id }, data })
      : client.depositTransaction.create({ data }));

    const nextBookingStatus = DEPOSIT_TO_BOOKING_STATUS[status];
    if (booking.status !== nextBookingStatus) {
      await client.booking.update({
        where: { id: bookingId },
        data: { status: nextBookingStatus },
      });
      if (changedBy) {
        await client.bookingStatusLog.create({
          data: {
            bookingId,
            changedBy,
            status: nextBookingStatus,
            notes: getAutoDepositStatusNote(status),
          },
        });
      }
    }

    return transaction;
  }
}
