import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { generateBookingCode } from '../common/utils/generate-booking-code';
import { AdminRole, Prisma } from '@prisma/client';
import { DepositService } from '../finance/deposit.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { ROLE } from '../../auth/role.constants';

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  role?: AdminRole;
}

const ACTIVITY_TYPE = {
  BOOKING_STATUS_CHANGED: 'BOOKING_STATUS_CHANGED',
  PRESSER_ASSIGNED: 'PRESSER_ASSIGNED',
} as const;

type BookingPresserDelegate = {
  deleteMany(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<unknown>;
  upsert(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  findUnique(args: unknown): Promise<unknown>;
};

function bookingPresserDelegate(client: PrismaService | Prisma.TransactionClient) {
  return (client as unknown as { bookingPresser: BookingPresserDelegate }).bookingPresser;
}

function fullName(user: AuthUser) {
  return `${user.firstName} ${user.lastName}`;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly depositService: DepositService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(dto: CreateBookingDto) {
    const {
      bookingItems,
      deepInfoResponses,
      formData,
      showRoundId: _showRoundId,
      zoneId: _zoneId,
      ...bookingData
    } = dto;

    let bookingCode: string;
    do {
      bookingCode = generateBookingCode();
    } while (await this.prisma.booking.findUnique({ where: { bookingCode } }));

    return this.prisma.booking.create({
      data: {
        ...bookingData,
        bookingCode,
        ...(bookingItems?.length && {
          bookingItems: {
            create: bookingItems.map((item) => ({
              roundId: item.roundId,
              zoneId: item.zoneId,
              quantity: item.quantity,
              notes: item.notes,
            })),
          },
        }),
        ...(deepInfoResponses?.length && {
          deepInfoResponses: {
            create: deepInfoResponses.map((r) => ({
              fieldId: r.fieldId,
              value: r.value,
            })),
          },
        }),
        ...(formData && {
          formSubmission: {
            create: { formData },
          },
        }),
      },
      include: {
        event: true,
        customer: true,
        bookingItems: { include: { round: true, zone: true } },
        deepInfoResponses: { include: { field: true } },
        formSubmission: true,
      },
    });
  }

  async findAll(query: QueryBookingDto, user?: AuthUser) {
    const { page = 1, pageSize= 20, search, eventId, status } = query;
    const skip = (page - 1) * pageSize;
    const accessibleBookingIds =
      user?.role === ROLE.PRESSER ? await this.getAccessibleBookingIds(user.id) : undefined;

    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(status && { status }),
      ...(eventId && { eventId }),
      ...(user?.role === ROLE.PRESSER && {
        id: { in: accessibleBookingIds?.length ? accessibleBookingIds : [-1] },
      }),
      ...(search && {
        OR: [
          { bookingCode: { contains: search, mode: 'insensitive' as const } },
          { customer: { fullName: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          bookingCode: true,
          status: true,
          nameCustomer: true,
          ...(user?.role !== ROLE.PRESSER && {
            depositPaid: true,
          }),
          createdAt: true,
          event: { select: { id: true, name: true, type: true } },
          customer: { select: { id: true, fullName: true } },
          bookingItems: {
            select: {
              round: { select: { id: true, name: true } },
              zone: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      pagination: {
        totalCounts: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: number, user?: AuthUser) {
    if (user?.role === ROLE.PRESSER) await this.assertPresserCanAccess(id, user.id);

    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: {
        id: true,
        bookingCode: true,
        status: true,
        paymentStatus: true,
        nameCustomer: true,
        ...(user?.role !== ROLE.PRESSER && {
          netCardPrice: true,
          serviceFee: true,
          shippingFee: true,
          vatAmount: true,
          depositPaid: true,
          totalPaid: true,
          refundAmount: true,
        }),
        notes: true,
        createdAt: true,
        createdBy: true,
        updatedAt: true,
        updatedBy: true,
        event: { select: { id: true, name: true, type: true } },
        customer: {
          select: {
            id: user?.role !== ROLE.PRESSER,
            fullName: true,
            nickname: true,
            phone: true,
            lineId: true,
            ...(user?.role !== ROLE.PRESSER && { email: true }),
          },
        },
        bookingItems: { include: { round: true, zone: true } },
        deepInfoResponses: { include: { field: true } },
        formSubmission: true,
        pressers: {
          where: { deletedAt: null },
          include: { presser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
        },
        bookedTickets: { where: { voidedAt: null }, include: { zone: true, pressedBy: { select: { id: true, firstName: true, lastName: true } } } },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          include: { admin: { select: { id: true, firstName: true, lastName: true } } },
        },
        paymentSlips: {
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(id: number, dto: UpdateBookingDto, user: AuthUser) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id },
        data: {
          ...dto,
          updatedBy: fullName(user),
        },
      });

      if (dto.status) {
        await tx.bookingStatusLog.create({
          data: {
            bookingId: id,
            changedBy: user.id,
            status: dto.status,
            notes: dto.notes,
          },
        });
        await this.activityLogService.log(
          {
            actorId: user.id,
            type: ACTIVITY_TYPE.BOOKING_STATUS_CHANGED,
            bookingId: id,
            entity: 'Booking',
            entityId: id,
            metadata: { status: dto.status, notes: dto.notes ?? null },
          },
          tx,
        );
        await this.depositService.recompute(id, tx);
      }

      return booking;
    });
  }

  async remove(id: number, user: AuthUser) {
    await this.findOne(id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: fullName(user),
      },
    });
  }

  async assignPressers(id: number, presserIds: number[], user: AuthUser) {
    await this.findOne(id);
    const pressers = await this.prisma.user.findMany({
      where: { id: { in: presserIds }, role: ROLE.PRESSER, isActive: true },
      select: { id: true },
    });
    if (pressers.length !== presserIds.length) {
      throw new NotFoundException('One or more pressers were not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const bookingPresser = bookingPresserDelegate(tx);
      await bookingPresser.updateMany({
        where: { bookingId: id, presserId: { notIn: presserIds }, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: user.id },
      });

      for (const presserId of presserIds) {
        await bookingPresser.upsert({
          where: { bookingId_presserId: { bookingId: id, presserId } },
          create: { bookingId: id, presserId, assignedBy: user.id, deletedAt: null, deletedBy: null },
          update: { assignedBy: user.id, assignedAt: new Date(), deletedAt: null, deletedBy: null },
        });
      }

      await this.activityLogService.log(
        {
          actorId: user.id,
          type: ACTIVITY_TYPE.PRESSER_ASSIGNED,
          bookingId: id,
          entity: 'Booking',
          entityId: id,
          metadata: { presserIds },
        },
        tx,
      );

      return bookingPresser.findMany({
        where: { bookingId: id, deletedAt: null },
        include: { presser: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });
    });
  }

  async removePresser(id: number, presserId: number, user?: AuthUser) {
    await this.findOne(id);
    return bookingPresserDelegate(this.prisma).update({
      where: { bookingId_presserId: { bookingId: id, presserId } },
      data: { deletedAt: new Date(), deletedBy: user?.id ?? null },
    });
  }

  async listPressers(id: number, user: AuthUser, search?: string) {
    await this.findOne(id);
    if (user.role === ROLE.PRESSER) await this.assertPresserCanAccess(id, user.id);

    const assignedPressers = (await bookingPresserDelegate(this.prisma).findMany({
      where: { bookingId: id, deletedAt: null },
      include: { presser: { select: { id: true } } },
    })) as Array<{
      presser?: {
        id?: number;
      };
    }>;
    const assignedPresserIds = new Set(assignedPressers.map(({ presser }) => presser?.id).filter(Boolean));

    const pressers = (await this.prisma.user.findMany({
      where: { role: ROLE.PRESSER, isActive: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        line: true,
        createdAt: true,
      },
    })) as Array<{
      id: number;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      line?: string | null;
      createdAt: Date;
    }>;

    const data = pressers.map((presser) => ({
      ...presser,
      isAssigned: assignedPresserIds.has(presser.id),
    }));

    const keyword = search?.trim().toLowerCase();
    if (!keyword) return data;

    return data.filter((presser) => {
      const firstName = presser.firstName ?? '';
      const lastName = presser.lastName ?? '';
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const reverseFullName = `${lastName} ${firstName}`.trim().toLowerCase();
      const email = presser.email?.toLowerCase() ?? '';
      return fullName.includes(keyword) || reverseFullName.includes(keyword) || email.includes(keyword);
    });
  }

  async listAssignedPressers(id: number, user: AuthUser, search?: string) {
    if (user.role === ROLE.PRESSER) await this.assertPresserCanAccess(id, user.id);
    const pressers = (await bookingPresserDelegate(this.prisma).findMany({
      where: { bookingId: id, deletedAt: null },
      include: { presser: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    })) as Array<{
      presser?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
      };
    }>;

    const keyword = search?.trim().toLowerCase();
    if (!keyword) return pressers;

    return pressers.filter(({ presser }) => {
      const firstName = presser?.firstName ?? '';
      const lastName = presser?.lastName ?? '';
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const reverseFullName = `${lastName} ${firstName}`.trim().toLowerCase();
      const email = presser?.email?.toLowerCase() ?? '';
      return fullName.includes(keyword) || reverseFullName.includes(keyword) || email.includes(keyword);
    });
  }

  async assertPresserCanAccess(bookingId: number, userId: number) {
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
            AND bp."presserId" = ${userId}
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
