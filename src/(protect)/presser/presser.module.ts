import { Module } from '@nestjs/common';
import { PresserController } from './presser.controller';
import { PresserService } from './presser.service';
import { DepositService } from '../finance/deposit.service';
import { ActivityLogService } from '../common/services/activity-log.service';

@Module({
  controllers: [PresserController],
  providers: [PresserService, DepositService, ActivityLogService],
})
export class PresserModule {}
