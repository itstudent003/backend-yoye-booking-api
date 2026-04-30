import { Module } from '@nestjs/common';
import { ActivityLogService } from '../common/services/activity-log.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, ActivityLogService],
})
export class ExpensesModule {}
