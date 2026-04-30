import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, EventType, PaymentSlipStatus, RefundStatus } from '@prisma/client';

const TICKET_IN_PROGRESS_STATUSES = [
  BookingStatus.WAITING_BOOKING_INFO,
  BookingStatus.TRANSFERRING_TICKET,
  BookingStatus.CONFIRMING_TICKET,
  BookingStatus.WAITING_ADMIN_CONFIRM,
  BookingStatus.READY_TO_BOOK,
  BookingStatus.BOOKING_IN_PROGRESS,
  BookingStatus.PARTIALLY_BOOKED,
];

const TICKET_COMPLETED_STATUSES = [
  BookingStatus.FULLY_BOOKED,
  BookingStatus.COMPLETED,
  BookingStatus.CUSTOMER_SELF_BOOKED,
  BookingStatus.TEAM_BOOKED,
  BookingStatus.PARTIAL_SELF_TEAM_BOOKING,
];

const DEPOSIT_HELD_STATUS = BookingStatus.DEPOSIT_PENDING;

function getPriority(createdAt: Date): 'high' | 'medium' | 'low' {
  const ageMs = Date.now() - createdAt.getTime();
  const hours = ageMs / (1000 * 60 * 60);
  if (hours > 24) return 'high';
  if (hours > 1) return 'medium';
  return 'low';
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      ticketPending,
      ticketInProgress,
      ticketCompleted,
      formNew,
      formPendingReview,
      depositsHeld,
      refundsAccumulated,
    ] = await Promise.all([
      // Ticket: รออนุมัติคิว
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: BookingStatus.WAITING_QUEUE_APPROVAL,
          event: { type: EventType.TICKET },
        },
      }),
      // Ticket: กำลังดำเนินการ
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: { in: TICKET_IN_PROGRESS_STATUSES },
          event: { type: EventType.TICKET },
        },
      }),
      // Ticket: เสร็จสิ้น
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: { in: TICKET_COMPLETED_STATUSES },
          event: { type: EventType.TICKET },
        },
      }),
      // Form: ฟอร์มใหม่ (24 ชั่วโมงที่ผ่านมา)
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          event: { type: EventType.FORM },
          createdAt: { gte: yesterday },
        },
      }),
      // Form: รอตรวจสอบ (สลิป PENDING ของ FORM)
      this.prisma.paymentSlip.count({
        where: {
          status: PaymentSlipStatus.PENDING,
          booking: {
            deletedAt: null,
            event: { type: EventType.FORM },
          },
        },
      }),
      // Finance: มัดจำถืออยู่
      this.prisma.booking.aggregate({
        _sum: { depositPaid: true },
        where: { status: DEPOSIT_HELD_STATUS, deletedAt: null },
      }),
      // Finance: เงินคืนสะสม
      this.prisma.refundRequest.aggregate({
        _sum: { amount: true },
        where: { status: RefundStatus.PAID },
      }),
    ]);

    return {
      ticket: {
        pendingApproval: ticketPending,
        inProgress: ticketInProgress,
        totalCompleted: ticketCompleted,
      },
      form: {
        newForms: formNew,
        pendingReview: formPendingReview,
      },
      finance: {
        depositsHeld: depositsHeld._sum.depositPaid ?? 0,
        refundsAccumulated: refundsAccumulated._sum.amount ?? 0,
      },
    };
  }

  async getAlerts(limit = 10) {
    const [pendingSlips, requestedRefunds] = await Promise.all([
      this.prisma.paymentSlip.findMany({
        where: { status: PaymentSlipStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          createdAt: true,
          booking: { select: { bookingCode: true, nameCustomer: true } },
        },
      }),
      this.prisma.refundRequest.findMany({
        where: { status: RefundStatus.REQUESTED },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          amount: true,
          requestedAt: true,
          booking: { select: { bookingCode: true, nameCustomer: true } },
        },
      }),
    ]);

    const slipAlerts = pendingSlips.map((s) => ({
      id: `slip-${s.id}`,
      type: 'slip' as const,
      message: `สลิปรอตรวจสอบ (${s.type}) — ${s.booking?.bookingCode ?? ''} ${s.booking?.nameCustomer ? `(${s.booking.nameCustomer})` : ''}`.trim(),
      time: s.createdAt,
      priority: getPriority(s.createdAt),
    }));

    const refundAlerts = requestedRefunds.map((r) => ({
      id: `refund-${r.id}`,
      type: 'refund' as const,
      message: `คำขอคืนเงิน ${r.amount?.toLocaleString('th-TH')} บาท — ${r.booking?.bookingCode ?? ''} ${r.booking?.nameCustomer ? `(${r.booking.nameCustomer})` : ''}`.trim(),
      time: r.requestedAt,
      priority: getPriority(r.requestedAt),
    }));

    return [...slipAlerts, ...refundAlerts]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, limit);
  }

  async getActions() {
    const [pendingSlips, requestedRefunds, approvedRefunds, waitingDeposits, pendingExpenses] = await Promise.all([
      this.prisma.paymentSlip.count({ where: { status: PaymentSlipStatus.PENDING } }),
      this.prisma.refundRequest.count({ where: { status: RefundStatus.REQUESTED } }),
      this.prisma.refundRequest.count({ where: { status: RefundStatus.APPROVED } }),
      this.prisma.depositTransaction.count({ where: { status: 'WAITING_REFUND' } }),
      this.prisma.expense.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      pendingSlips,
      requestedRefunds,
      approvedRefunds,
      waitingDeposits,
      pendingExpenses,
      total: pendingSlips + requestedRefunds + approvedRefunds + waitingDeposits + pendingExpenses,
    };
  }

  async getActivity(limit = 10) {
    const logs = await this.prisma.bookingStatusLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        notes: true,
        createdAt: true,
        booking: { select: { bookingCode: true } },
        admin: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      type: 'status_changed',
      message: `${log.booking?.bookingCode ?? `#${log.id}`} → ${log.status}${log.notes ? ` (${log.notes})` : ''}`,
      actor: `${log.admin?.firstName ?? ''} ${log.admin?.lastName ?? ''}`.trim() || 'System',
      actorId: log.admin?.id ?? null,
      createdAt: log.createdAt,
    }));
  }
}
