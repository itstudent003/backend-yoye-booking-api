import { Module } from '@nestjs/common';
import { RefundRequestsController } from './refund-requests.controller';
import { RefundRequestsService } from './refund-requests.service';
import { ActivityLogService } from '../common/services/activity-log.service';

@Module({
  controllers: [RefundRequestsController],
  providers: [RefundRequestsService, ActivityLogService],
})
export class RefundRequestsModule {}
