import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './(protect)/users/users.module';
import { CustomersModule } from './(protect)/customers/customers.module';
import { EventsModule } from './(protect)/events/events.module';
import { BookingsModule } from './(protect)/bookings/bookings.module';
import { PaymentSlipsModule } from './(protect)/payment-slips/payment-slips.module';
import { FulfillmentsModule } from './(protect)/fulfillments/fulfillments.module';

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
