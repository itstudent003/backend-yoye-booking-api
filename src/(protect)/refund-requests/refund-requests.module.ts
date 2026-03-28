import { Module } from '@nestjs/common';
import { RefundRequestsController } from './refund-requests.controller';
import { RefundRequestsService } from './refund-requests.service';

@Module({
  controllers: [RefundRequestsController],
  providers: [RefundRequestsService],
})
export class RefundRequestsModule {}