import { Module } from '@nestjs/common';
import { FulfillmentsController } from './fulfillments.controller';
import { FulfillmentsService } from './fulfillments.service';

@Module({
  controllers: [FulfillmentsController],
  providers: [FulfillmentsService],
})
export class FulfillmentsModule {}
