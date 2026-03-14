import { Module } from '@nestjs/common';
import { PaymentSlipsController } from './payment-slips.controller';
import { PaymentSlipsService } from './payment-slips.service';

@Module({
  controllers: [PaymentSlipsController],
  providers: [PaymentSlipsService],
})
export class PaymentSlipsModule {}
