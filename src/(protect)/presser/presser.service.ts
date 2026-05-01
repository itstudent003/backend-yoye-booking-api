import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, AdminRole, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DepositService } from '../finance/deposit.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { RecordTicketDto } from './dto/record-ticket.dto';
import { UpdatePresserStatusDto } from './dto/update-presser-status.dto';
import { ROLE } from '../../auth/role.constants';

const ALLOWED_PRESSER_STATUSES: BookingStatus[] = [
  BookingStatus.BOOKING_IN_PROGRESS,
  BookingStatus.FULLY_BOOKED,
  BookingStatus.BOOKING_FAILED,
  BookingStatus.PARTIALLY_BOOKED,
];

const HIDDEN_PRESSER_LIST_STATUSES: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.CLOSED_REFUNDED,
];

type AuthUser = { id: number; role: AdminRole; firstName?: string; lastName?: string };

type RecordedTicketResponse = {
  zoneId: number | null;
  zoneName: string;
  seat: string;
  price: unknown;
  notes: string | null;
};

function toRecordedTicketResponse(ticket: {
  zoneId?: number | null;
  zoneNameRaw: string;
  seat: string;
  price: unknown;
  notes?: string | null;
}): RecordedTicketResponse {
  return {
    zoneId: ticket.zoneId ?? null,
    zoneName: ticket.zoneNameRaw,
    seat: ticket.seat,
    price: ticket.price,
    notes: ticket.notes ?? null,
  };
}

@Injectable()
export class PresserService {
  constructor(
    private prisma: PrismaService,
    private depositService: DepositService,
    private activityLogService: ActivityLogService,
  ) {}

  async listBookings(user: AuthUser, page = 1, pageSize = 20, search?: string) {
    const accessibleBookingIds =
      user.role === ROLE.PRESSER ? await this.getAccessibleBookingIds(user.id) : undefined;
    const keyword = search?.trim();
    const where: Prisma.BookingWhereInput =
      user.role === ROLE.PRESSER
        ? {
            deletedAt: null,
            isActive: true,
            id: { in: accessibleBookingIds?.length ? accessibleBookingIds : [-1] },
            status: { notIn: HIDDEN_PRESSER_LIST_STATUSES },
          }
        : {
            deletedAt: null,
            isActive: true,
            status: { notIn: HIDDEN_PRESSER_LIST_STATUSES },
          };
    if (keyword) {
      where.OR = [
        { bookingCode: { contains: keyword, mode: 'insensitive' } },
        { nameCustomer: { contains: keyword, mode: 'insensitive' } },
        { event: { name: { contains: keyword, mode: 'insensitive' } } },
        { customer: { fullName: { contains: keyword, mode: 'insensitive' } } },
        { customer: { nickname: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingCode: true,
          status: true,
          nameCustomer: true,
          notes: true,
          createdAt: true,
          event: { select: { id: true, name: true, type: true, eventDate: true } },
          customer: { select: { fullName: true, nickname: true, phone: true, lineId: true } },
          bookingItems: {
            select: {
              id: true,
              quantity: true,
              notes: true,
              round: { select: { id: true, name: true, date: true, time: true } },
              zone: { select: { id: true, name: true, price: true, fee: true } },
            },
          },
          credentials: {
            select: {
              id: true,
              site: true,
              username: true,
              passwordEncrypted: true,
              notes: true,
              createdAt: true,
            },
          },
          deepInfoResponses: {
            select: {
              value: true,
              field: { select: { id: true, label: true, otherCode: true } },
            },
          },
          bookedTickets: {
            where: { voidedAt: null },
            select: {
              id: true,
              zoneId: true,
              zoneNameRaw: true,
              seat: true,
              price: true,
              pressedAt: true,
              notes: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: data.map((booking) => {
        const bookingItems = booking.bookingItems.map((item) => ({
          id: item.id,
          name: item.zone?.name ?? item.notes ?? null,
          quantity: item.quantity,
          price: item.zone?.price ?? null,
          fee: item.zone?.fee ?? null,
          notes: item.notes,
          round: item.round,
          zone: item.zone,
        }));
        const firstRound = booking.bookingItems.find((item) => item.round)?.round ?? null;
        return {
          ...booking,
          round: firstRound,
          zones: bookingItems,
          bookingItems,
          zonesBackup: [],
          credentials: booking.credentials.map((credential) => ({
            ...credential,
            password: null,
          })),
          paymentMethod: null,
          paymentType: null,
          deepInfo: booking.deepInfoResponses.map((response) => ({
            id: response.field.id,
            label: response.field.label,
            otherCode: response.field.otherCode,
            value: response.value,
          })),
        };
      }),
      pagination: { totalCounts: total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getBooking(id: number, user: AuthUser) {
    await this.assertCanAccess(id, user);
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: {
        id: true,
        bookingCode: true,
        status: true,
        nameCustomer: true,
        notes: true,
        event: { select: { id: true, name: true, type: true, eventDate: true } },
        customer: { select: { fullName: true, phone: true, lineId: true } },
        bookingItems: { include: { round: true, zone: true } },
        deepInfoResponses: { include: { field: true } },
        credentials: true,
        bookedTickets: { where: { voidedAt: null }, include: { zone: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async updateStatus(id: number, dto: UpdatePresserStatusDto, user: AuthUser) {
    await this.assertCanAccess(id, user);
    if (!ALLOWED_PRESSER_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Status is not allowed for presser workflow');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({ where: { id }, data: { status: dto.status, updatedBy: 'Presser' } });
      await tx.bookingStatusLog.create({ data: { bookingId: id, changedBy: user.id, status: dto.status, notes: dto.notes } });
      await this.activityLogService.log(
        { actorId: user.id, type: ActivityType.BOOKING_STATUS_CHANGED, bookingId: id, entity: 'Booking', entityId: id, metadata: { status: dto.status, notes: dto.notes ?? null } },
        tx,
      );
      await this.depositService.recompute(id, tx);
      return booking;
    });
  }

  async recordTickets(id: number, input: RecordTicketDto | RecordTicketDto[], user: AuthUser) {
    await this.assertCanAccess(id, user);
    const tickets = Array.isArray(input) ? input : [input];
    return this.prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        tickets.map((ticket) =>
          tx.bookedTicket.create({
            data: {
              bookingId: id,
              zoneId: ticket.zoneId,
              zoneNameRaw: ticket.zoneNameRaw,
              seat: ticket.seat,
              price: ticket.price,
              pressedById: user.id,
              notes: ticket.notes,
            },
          }),
        ),
      );
      await this.activityLogService.log(
        { actorId: user.id, type: ActivityType.TICKET_RECORDED, bookingId: id, entity: 'BookedTicket', metadata: { count: created.length } },
        tx,
      );
      await this.depositService.recompute(id, tx);
      const response = created.map(toRecordedTicketResponse);
      return Array.isArray(input) ? response : response[0];
    });
  }

  async replaceTickets(id: number, tickets: RecordTicketDto[], user: AuthUser) {
    await this.assertCanAccess(id, user);
    return this.prisma.$transaction(async (tx) => {
      await tx.bookedTicket.updateMany({ where: { bookingId: id, voidedAt: null }, data: { voidedAt: new Date(), voidedById: user.id } });
      const created = await Promise.all(tickets.map((ticket) => tx.bookedTicket.create({ data: { ...ticket, bookingId: id, pressedById: user.id } })));
      await this.depositService.recompute(id, tx);
      return created;
    });
  }

  async updateTicket(bookingId: number, ticketId: number, dto: Partial<RecordTicketDto>, user: AuthUser) {
    await this.assertCanAccess(bookingId, user);
    const ticket = await this.prisma.bookedTicket.findFirst({ where: { id: ticketId, bookingId, voidedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const updated = await this.prisma.bookedTicket.update({ where: { id: ticketId }, data: dto });
    await this.depositService.recompute(bookingId);
    return updated;
  }

  async voidTicket(bookingId: number, ticketId: number, user: AuthUser) {
    const ticket = await this.prisma.bookedTicket.findFirst({ where: { id: ticketId, bookingId, voidedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const updated = await this.prisma.bookedTicket.update({ where: { id: ticketId }, data: { voidedAt: new Date(), voidedById: user.id } });
    await this.activityLogService.log({ actorId: user.id, type: ActivityType.TICKET_VOIDED, bookingId, entity: 'BookedTicket', entityId: ticketId, metadata: {} });
    await this.depositService.recompute(bookingId);
    return updated;
  }

  private async assertCanAccess(bookingId: number, user: AuthUser) {
    if (user.role !== ROLE.PRESSER) return;
    const rows = await this.prisma.$queryRaw<Array<{ allowed: boolean }>>(Prisma.sql`
      SELECT TRUE AS "allowed"
      FROM "bookings" b
      WHERE b."id" = ${bookingId}
        AND b."deletedAt" IS NULL
        AND b."isActive" = true
        AND EXISTS (
          SELECT 1
          FROM "booking_pressers" bp
          WHERE bp."bookingId" = b."id"
            AND bp."presserId" = ${user.id}
            AND bp."deletedAt" IS NULL
        )
      LIMIT 1
    `);
    if (!rows.length) throw new ForbiddenException();
  }

  private async getAccessibleBookingIds(userId: number) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT DISTINCT b."id"
      FROM "bookings" b
      WHERE b."deletedAt" IS NULL
        AND b."isActive" = true
        AND EXISTS (
          SELECT 1
          FROM "booking_pressers" bp
          WHERE bp."bookingId" = b."id"
            AND bp."presserId" = ${userId}
            AND bp."deletedAt" IS NULL
        )
    `);
    return rows.map((row) => row.id);
  }
}
