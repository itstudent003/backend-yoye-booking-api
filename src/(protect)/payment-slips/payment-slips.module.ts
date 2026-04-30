import { Module } from '@nestjs/common';
import { PaymentSlipsController } from './payment-slips.controller';
import { PaymentSlipsService } from './payment-slips.service';
import { DepositService } from '../finance/deposit.service';
import { ActivityLogService } from '../common/services/activity-log.service';

@Module({
  controllers: [PaymentSlipsController],
  providers: [PaymentSlipsService, DepositService, ActivityLogService],
})
export class PaymentSlipsModule {}
