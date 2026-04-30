import { BadRequestException, Injectable } from '@nestjs/common';
import { ActivityType, ExpenseStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseStatusDto } from './dto/update-expense-status.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  async submit(dto: CreateExpenseDto, submittedById: number) {
    const expense = await this.prisma.expense.create({ data: { ...dto, submittedById } });
    await this.activityLogService.log({
      actorId: submittedById,
      type: ActivityType.EXPENSE_SUBMITTED,
      bookingId: expense.bookingId,
      entity: 'Expense',
      entityId: expense.id,
      metadata: { amount: Number(expense.amount), category: expense.category },
    });
    return expense;
  }

  findAll() {
    return this.prisma.expense.findMany({
      orderBy: { submittedAt: 'desc' },
      include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, approvedBy: { select: { id: true, firstName: true, lastName: true } }, booking: { select: { bookingCode: true } }, event: { select: { name: true } } },
    });
  }

  findMine(userId: number) {
    return this.prisma.expense.findMany({ where: { submittedById: userId }, orderBy: { submittedAt: 'desc' } });
  }

  async updateStatus(id: number, dto: UpdateExpenseStatusDto, userId: number) {
    if (dto.status === ExpenseStatus.REJECTED && !dto.rejectedNote) throw new BadRequestException('rejectedNote is required');
    const data =
      dto.status === ExpenseStatus.APPROVED
        ? { status: dto.status, approvedById: userId, approvedAt: new Date() }
        : dto.status === ExpenseStatus.PAID
          ? { status: dto.status, settledAt: new Date(), settlementNote: dto.settlementNote }
          : { status: dto.status, rejectedNote: dto.rejectedNote };

    const expense = await this.prisma.expense.update({ where: { id }, data });
    if (dto.status === ExpenseStatus.APPROVED || dto.status === ExpenseStatus.REJECTED) {
      await this.activityLogService.log({
        actorId: userId,
        type: dto.status === ExpenseStatus.APPROVED ? ActivityType.EXPENSE_APPROVED : ActivityType.EXPENSE_REJECTED,
        bookingId: expense.bookingId,
        entity: 'Expense',
        entityId: expense.id,
        metadata: { status: dto.status },
      });
    }
    return expense;
  }

  async getSettlement(from?: string, to?: string) {
    const where = {
      status: ExpenseStatus.PAID,
      ...(from || to ? { settledAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
    };
    const rows = await this.prisma.expense.groupBy({
      by: ['submittedById'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.submittedById) } },
      select: { id: true, firstName: true, lastName: true },
    });
    return rows.map((row) => ({
      submittedById: row.submittedById,
      user: users.find((user) => user.id === row.submittedById) ?? null,
      totalAmount: row._sum.amount ?? 0,
      count: row._count._all,
    }));
  }
}
