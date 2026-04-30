import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type ActivityLogParams = {
  actorId?: number | null;
  type: string;
  metadata?: Prisma.InputJsonValue;
  bookingId?: number | null;
  entity: string;
  entityId?: number | null;
  action?: string;
  message?: string | null;
};

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: ActivityLogParams, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    const booking = params.bookingId
      ? await client.booking.findUnique({
          where: { id: params.bookingId },
          select: { bookingCode: true },
        })
      : null;

    return client.activityLog.create({
      data: {
        userId: params.actorId ?? undefined,
        actorId: params.actorId ?? undefined,
        entityType: params.entity,
        entity: params.entity,
        entityId: params.entityId ?? undefined,
        action: params.action ?? params.type,
        type: params.type as never,
        metadata: params.metadata ?? {},
        bookingId: params.bookingId ?? undefined,
        bookingCode: booking?.bookingCode,
        message: params.message,
      },
    });
  }
}
