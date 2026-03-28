import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PaymentSlipsService } from './payment-slips.service';
import { CreatePaymentSlipDto } from './dto/create-payment-slip.dto';
import { QueryPaymentSlipDto } from './dto/query-payment-slip.dto';
import { RejectPaymentSlipDto } from './dto/reject-payment-slip.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payment-slips')
export class PaymentSlipsController {
  constructor(private readonly paymentSlipsService: PaymentSlipsService) {}

  @Post()
  create(@Body() dto: CreatePaymentSlipDto) {
    return this.paymentSlipsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryPaymentSlipDto) {
    return this.paymentSlipsService.findAll(query);
  }

  @Get('booking/:bookingId')
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentSlipsService.findByBooking(+bookingId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentSlipsService.findOne(+id);
  }

  @Patch(':id/verify')
  verify(@Param('id') id: string, @Request() req) {
    return this.paymentSlipsService.verify(+id, req.user.id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Request() req, @Body() dto: RejectPaymentSlipDto) {
    return this.paymentSlipsService.reject(+id, req.user.id, dto.notes);
  }
}
