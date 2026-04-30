import { Injectable, NotFoundException } from '@nestjs/common';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketEventDto } from './dto/create-ticket-event.dto';
import { CreateFormEventDto } from './dto/create-form-event.dto';
import { UpdateTicketEventDto } from './dto/update-ticket-event.dto';
import { UpdateFormEventDto } from './dto/update-form-event.dto';
import { Prisma } from '@prisma/client';
import { ROLE } from '../../auth/role.constants';

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
}

function fullName(user: AuthUser) {
  return `${user.firstName} ${user.lastName}`;
}

function savePosterImage(file?: Express.Multer.File, base64?: string): string | undefined {
  if (file) {
    return `image/upload/events/${file.filename}`;
  }
  if (base64?.startsWith('data:image/')) {
    const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/s);
    if (!matches) return undefined;
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    writeFileSync(join(process.cwd(), 'image', 'upload', 'events', filename), Buffer.from(matches[2], 'base64'));
    return `image/upload/events/${filename}`;
  }
  return undefined;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(dto: CreateTicketEventDto, user: AuthUser, file?: Express.Multer.File) {
    const { showRounds, deepInfoFields, status, posterImage, ...eventData } = dto;
    const posterImagePath = savePosterImage(file, posterImage);

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          ...eventData,
          type: 'TICKET',
          createdBy: fullName(user),
          ...(posterImagePath && { posterImage: posterImagePath }),
          ...(status !== undefined && { status }),
          ...(deepInfoFields?.length && {
            deepInfoFields: {
              create: deepInfoFields.map((f) => ({
                otherCode: f.otherCode ?? '',
                label: f.label,
                isRequired: f.isRequired,
              })),
            },
          }),
        },
      });

      for (const round of showRounds) {
        await tx.showRound.create({
          data: {
            eventId: created.id,
            name: round.name,
            date: new Date(`${round.date}T${round.time}:00`),
            time: round.time,
            zones: {
              create: round.zones.map((zone) => ({
                name: zone.name,
                price: Number.parseFloat(zone.price),
                fee: Number.parseFloat(zone.fee),
                capacity: Number.parseInt(zone.capacity, 10),
              })),
            },
          },
        });
      }

      return tx.event.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          showRounds: { include: { zones: true } },
          deepInfoFields: true,
        },
      });
    });

    return event;
  }

  async createForm(dto: CreateFormEventDto, user: AuthUser, file?: Express.Multer.File) {
    const { deepInfoFields, eventDate, feePerEntry, capacity, status, posterImage, ...eventData } = dto;
    const posterImagePath = savePosterImage(file, posterImage);

    return this.prisma.event.create({
      data: {
        ...eventData,
        type: 'FORM',
        createdBy: fullName(user),
        ...(posterImagePath && { posterImage: posterImagePath }),
        ...(status !== undefined && { status }),
        ...(eventDate && { eventDate: new Date(`${eventDate}T00:00:00`) }),
        ...(feePerEntry && { feePerEntry: Number.parseFloat(feePerEntry) }),
        ...(capacity && { capacity: Number.parseInt(capacity, 10) }),
        deepInfoFields: deepInfoFields?.length
          ? {
              create: deepInfoFields.map((f) => ({
                otherCode: f.otherCode ?? '',
                label: f.label,
                isRequired: f.isRequired,
              })),
            }
          : undefined,
      },
      include: {
        deepInfoFields: true,
      },
    });
  }

  async findAll(page?: number, pageSize?: number, search?: string, type?: string) {
    const isPaginated = page !== undefined && pageSize !== undefined;

    const where = {
      deletedAt: null,
      isActive: true,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
      ...(type && { type: type as 'TICKET' | 'FORM' }),
    };

    if (!isPaginated) {
      const events = await this.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          capacity: true,
          status: true,
          showRounds: {
            select: {
              zones: { select: { capacity: true } },
            },
          },
          _count: {
            select: {
              bookings: { where: { status: 'QUEUE_BOOKED' as const } },
            },
          },
        },
      });

      return {
        data: events.map((e) => {
          const totalCapacity =
            e.type === 'TICKET'
              ? e.showRounds.flatMap((r) => r.zones).reduce((sum, z) => sum + z.capacity, 0)
              : (e.capacity ?? 0);
          return {
            id: e.id,
            name: e.name,
            type: e.type,
            capacity: totalCapacity,
            capacityAmount: totalCapacity - e._count.bookings,
            status: e.status,
          };
        }),
      };
    }

    const [totalCounts, events] = await this.prisma.$transaction([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          type: true,
          capacity: true,
          status: true,
          showRounds: {
            select: {
              zones: { select: { capacity: true } },
            },
          },
          _count: {
            select: {
              bookings: { where: { status: 'QUEUE_BOOKED' as const } },
            },
          },
        },
      }),
    ]);

    return {
      data: events.map((e) => {
        const totalCapacity =
          e.type === 'TICKET'
            ? e.showRounds.flatMap((r) => r.zones).reduce((sum, z) => sum + z.capacity, 0)
            : (e.capacity ?? 0);
        return {
          id: e.id,
          name: e.name,
          type: e.type,
          capacity: totalCapacity,
          capacityAmount: totalCapacity - e._count.bookings,
          status: e.status,
        };
      }),
      pagination: {
        totalCounts,
        page,
        pageSize,
        totalPages: Math.ceil(totalCounts / pageSize),
      },
    };
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        notes: true,
        posterUrl: true,
        posterImage: true,
        type: true,
        eventDate: true,
        feePerEntry: true,
        capacity: true,
        isActive: true,
        status: true,
        showRounds: { include: { zones: true } },
        deepInfoFields: true,
        _count: { select: { bookings: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async findPressers(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const data = await this.prisma.$queryRaw<
      Array<{
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        line: string | null;
        assignedAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        u."id",
        u."email",
        u."firstName",
        u."lastName",
        u."phone",
        u."line",
        ep."assignedAt"
      FROM "event_pressers" ep
      JOIN "users" u ON u."id" = ep."presserId"
      WHERE ep."eventId" = ${id}
        AND ep."deletedAt" IS NULL
        AND u."isActive" = true
      ORDER BY u."firstName" ASC, u."lastName" ASC
    `);

    return { data };
  }

  async assignPressers(id: number, presserIds: number[], user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const uniquePresserIds = [...new Set(presserIds.map(Number).filter(Boolean))];
    if (!uniquePresserIds.length) return this.findPressers(id);

    const pressers = await this.prisma.user.findMany({
      where: { id: { in: uniquePresserIds }, role: ROLE.PRESSER, isActive: true },
      select: { id: true },
    });
    if (pressers.length !== uniquePresserIds.length) {
      throw new NotFoundException('One or more pressers were not found');
    }

    await this.prisma.$transaction(
      uniquePresserIds.map((presserId) =>
        this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO "event_pressers" ("eventId", "presserId", "assignedBy", "assignedAt", "deletedAt", "deletedBy")
          VALUES (${id}, ${presserId}, ${user.id}, NOW(), NULL, NULL)
          ON CONFLICT ("eventId", "presserId")
          DO UPDATE SET
            "assignedBy" = EXCLUDED."assignedBy",
            "assignedAt" = NOW(),
            "deletedAt" = NULL,
            "deletedBy" = NULL
        `),
      ),
    );

    return this.findPressers(id);
  }

  async removePresser(id: number, presserId: number, user?: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const result = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "event_pressers"
      SET "deletedAt" = NOW(),
          "deletedBy" = ${user?.id ?? null}
      WHERE "eventId" = ${id}
        AND "presserId" = ${presserId}
        AND "deletedAt" IS NULL
    `);

    return {
      eventId: id,
      presserId,
      removedAssignments: result,
    };
  }

  async updateTicket(id: number, dto: UpdateTicketEventDto, user: AuthUser, file?: Express.Multer.File) {
    await this.prisma.event.findUniqueOrThrow({ where: { id } });
    const { showRounds, deepInfoFields, status, posterImage, ...eventData } = dto;
    const posterImagePath = savePosterImage(file, posterImage);

    return this.prisma.$transaction(async (tx) => {
      if (showRounds?.length) {
        await tx.zone.deleteMany({ where: { round: { eventId: id } } });
        await tx.showRound.deleteMany({ where: { eventId: id } });
      }

      if (deepInfoFields) {
        await tx.deepInfoField.deleteMany({ where: { eventId: id } });
        await tx.deepInfoField.createMany({
          data: deepInfoFields.map((f) => ({
            eventId: id,
            otherCode: f.otherCode ?? '',
            label: f.label,
            isRequired: f.isRequired,
          })),
        });
      }

      if (showRounds?.length) {
        for (const round of showRounds) {
          await tx.showRound.create({
            data: {
              eventId: id,
              name: round.name,
              date: new Date(`${round.date}T${round.time}:00`),
              time: round.time,
              zones: {
                create: round.zones.map((zone) => ({
                  name: zone.name,
                  price: Number.parseFloat(zone.price),
                  fee: Number.parseFloat(zone.fee),
                  capacity: Number.parseInt(zone.capacity, 10),
                })),
              },
            },
          });
        }
      }

      return tx.event.update({
        where: { id },
        data: {
          ...eventData,
          updatedBy: fullName(user),
          ...(posterImagePath && { posterImage: posterImagePath }),
          ...(status !== undefined && { status }),
        },
        include: {
          showRounds: { include: { zones: true } },
          deepInfoFields: true,
        },
      });
    });
  }

  async updateForm(id: number, dto: UpdateFormEventDto, user: AuthUser, file?: Express.Multer.File) {
    await this.prisma.event.findUniqueOrThrow({ where: { id } });
    const { deepInfoFields, eventDate, feePerEntry, capacity, status, posterImage, ...eventData } = dto;
    const posterImagePath = savePosterImage(file, posterImage);

    return this.prisma.$transaction(async (tx) => {
      if (deepInfoFields) {
        await tx.deepInfoField.deleteMany({ where: { eventId: id } });
        await tx.deepInfoField.createMany({
          data: deepInfoFields.map((f) => ({
            eventId: id,
            otherCode: f.otherCode ?? '',
            label: f.label,
            isRequired: f.isRequired,
          })),
        });
      }

      return tx.event.update({
        where: { id },
        data: {
          ...eventData,
          updatedBy: fullName(user),
          ...(posterImagePath && { posterImage: posterImagePath }),
          ...(status !== undefined && { status }),
          ...(eventDate && { eventDate: new Date(`${eventDate}T00:00:00`) }),
          ...(feePerEntry && { feePerEntry: Number.parseFloat(feePerEntry) }),
          ...(capacity && { capacity: Number.parseInt(capacity, 10) }),
        },
        include: {
          deepInfoFields: true,
        },
      });
    });
  }

  async remove(id: number, user: AuthUser) {
    return this.prisma.event.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deletedBy: fullName(user),
      },
    });
  }
}
