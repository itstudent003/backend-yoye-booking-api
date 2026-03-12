import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { EventsModule } from './events/events.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentSlipsModule } from './payment-slips/payment-slips.module';
import { FulfillmentsModule } from './fulfillments/fulfillments.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    EventsModule,
    BookingsModule,
    PaymentSlipsModule,
    FulfillmentsModule,
  ],
})
export class AppModule {}
