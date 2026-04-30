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

type AuthUser = { id: number; role: AdminRole; firstName?: string; lastName?: string };

@Injectable()
export class PresserService {
  constructor(
    private prisma: PrismaService,
    private depositService: DepositService,
    private activityLogService: ActivityLogService,
  ) {}

  async listBookings(user: AuthUser, page = 1, pageSize = 20) {
    const where: Prisma.BookingWhereInput =
      user.role === ROLE.PRESSER
        ? { deletedAt: null, isActive: true, pressers: { some: { presserId: user.id } } }
        : { deletedAt: null, isActive: true };

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
          createdAt: true,
          event: { select: { id: true, name: true, type: true, eventDate: true } },
          customer: { select: { fullName: true, phone: true, lineId: true } },
          bookingItems: { select: { quantity: true, round: true, zone: true } },
          bookedTickets: { where: { voidedAt: null } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, pagination: { totalCounts: total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
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
      return Array.isArray(input) ? created : created[0];
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
    const link = await this.prisma.bookingPresser.findUnique({ where: { bookingId_presserId: { bookingId, presserId: user.id } } });
    if (!link) throw new ForbiddenException();
  }
}
