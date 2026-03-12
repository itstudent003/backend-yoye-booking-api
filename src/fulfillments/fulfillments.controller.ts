import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { FulfillmentsService } from './fulfillments.service';
import { UpdateFulfillmentDto } from './dto/update-fulfillment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('fulfillments')
export class FulfillmentsController {
  constructor(private fulfillmentsService: FulfillmentsService) {}

  @Post('booking/:bookingId')
  createOrUpdate(@Param('bookingId') bookingId: string, @Body() dto: UpdateFulfillmentDto) {
    return this.fulfillmentsService.createOrUpdate(+bookingId, dto);
  }

  @Get('booking/:bookingId')
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.fulfillmentsService.findByBooking(+bookingId);
  }

  @Patch('booking/:bookingId')
  update(@Param('bookingId') bookingId: string, @Body() dto: UpdateFulfillmentDto) {
    return this.fulfillmentsService.update(+bookingId, dto);
  }
}
