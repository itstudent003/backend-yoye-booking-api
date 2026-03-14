import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketEventDto } from './dto/create-ticket-event.dto';
import { CreateFormEventDto } from './dto/create-form-event.dto';
import { UpdateTicketEventDto } from './dto/update-ticket-event.dto';
import { UpdateFormEventDto } from './dto/update-form-event.dto';

interface AuthUser {
  firstName: string;
  lastName: string;
}

function fullName(user: AuthUser) {
  return `${user.firstName} ${user.lastName}`;
}

function toBuffer(base64?: string): Buffer | undefined {
  if (!base64) return undefined;
  const data = base64.includes(',') ? base64.split(',')[1] : base64;
  return Buffer.from(data, 'base64');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeEvent(event: any) {
  return {
    ...event,
    posterImage: event.posterImage
      ? `data:image/jpeg;base64,${(event.posterImage as Buffer).toString('base64')}`
      : null,
  };
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(dto: CreateTicketEventDto, user: AuthUser) {
    const { showRounds, deepInfoFields, status, posterImage, ...eventData } = dto;

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        type: 'TICKET',
        createdBy: fullName(user),
        ...(posterImage && { posterImage: toBuffer(posterImage) }),
        ...(status !== undefined && { status }),
        showRounds: {
          create: showRounds.map((round) => ({
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
          })),
        },
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
        showRounds: { include: { zones: true } },
        deepInfoFields: true,
      },
    });
    return serializeEvent(event);
  }

  async createForm(dto: CreateFormEventDto, user: AuthUser) {
    const { deepInfoFields, eventDate, feePerEntry, capacity, status, posterImage, ...eventData } = dto;

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        type: 'FORM',
        createdBy: fullName(user),
        ...(posterImage && { posterImage: toBuffer(posterImage) }),
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
    return serializeEvent(event);
  }

  async findAll() {
    const events = await this.prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        showRounds: { include: { zones: true } },
        _count: { select: { bookings: true } },
      },
    });
    return events.map(serializeEvent);
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        showRounds: { include: { zones: true } },
        deepInfoFields: true,
        _count: { select: { bookings: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return serializeEvent(event);
  }

  async updateTicket(id: number, dto: UpdateTicketEventDto, user: AuthUser) {
    await this.prisma.event.findUniqueOrThrow({ where: { id } });
    const { showRounds, deepInfoFields, status, posterImage, ...eventData } = dto;

    const event = await this.prisma.$transaction(async (tx) => {
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

      return tx.event.update({
        where: { id },
        data: {
          ...eventData,
          updatedBy: fullName(user),
          ...(posterImage && { posterImage: toBuffer(posterImage) }),
          ...(status !== undefined && { status }),
          ...(showRounds?.length && {
            showRounds: {
              create: showRounds.map((round) => ({
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
              })),
            },
          }),
        },
        include: {
          showRounds: { include: { zones: true } },
          deepInfoFields: true,
        },
      });
    });
    return serializeEvent(event);
  }

  async updateForm(id: number, dto: UpdateFormEventDto, user: AuthUser) {
    await this.prisma.event.findUniqueOrThrow({ where: { id } });
    const { deepInfoFields, eventDate, feePerEntry, capacity, status, posterImage, ...eventData } = dto;

    const event = await this.prisma.$transaction(async (tx) => {
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
          ...(posterImage && { posterImage: toBuffer(posterImage) }),
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
    return serializeEvent(event);
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
