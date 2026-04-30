import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { DepositService } from '../finance/deposit.service';
import { ActivityLogService } from '../common/services/activity-log.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, DepositService, ActivityLogService],
})
export class BookingsModule {}
