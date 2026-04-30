import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateRefundRequestDto } from '../(protect)/refund-requests/dto/create-refund-request.dto';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('bookings/:code/tickets')
  getTickets(@Param('code') code: string, @Query('phoneLast4') phoneLast4: string) {
    return this.publicService.getTickets(code, phoneLast4);
  }

  @Post('refund-requests')
  createRefundRequest(@Body() dto: CreateRefundRequestDto & { phoneLast4: string }) {
    return this.publicService.createRefundRequest(dto);
  }

  @Get('refund-requests/:bookingCode')
  getRefundRequests(@Param('bookingCode') bookingCode: string, @Query('phoneLast4') phoneLast4: string) {
    return this.publicService.getRefundRequests(bookingCode, phoneLast4);
  }
}
