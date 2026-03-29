import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FulfillmentsService } from './fulfillments.service';
import { QueryOrdersDto, TRACKING_STATUSES } from './dto/query-orders.dto';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
}

@ApiTags('Fulfillments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class FulfillmentsController {
  constructor(private readonly fulfillmentsService: FulfillmentsService) {}

  @ApiOperation({ summary: 'Get orders for tracking page' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TRACKING_STATUSES })
  @Get()
  findOrders(@Query() query: QueryOrdersDto) {
    return this.fulfillmentsService.findOrders(query);
  }

  @ApiOperation({ summary: 'Create bill → status changes to WAITING_SERVICE_FEE_VERIFY' })
  @Post(':bookingId/bill')
  createBill(
    @Param('bookingId') bookingId: string,
    @Request() req: { user: AuthUser },
    @Body() dto: CreateBillDto,
  ) {
    return this.fulfillmentsService.createBill(+bookingId, req.user.id, dto);
  }

  @ApiOperation({ summary: 'Edit bill → status changes to WAITING_SERVICE_FEE_VERIFY' })
  @Patch(':bookingId/bill')
  updateBill(
    @Param('bookingId') bookingId: string,
    @Request() req: { user: AuthUser },
    @Body() dto: CreateBillDto,
  ) {
    return this.fulfillmentsService.updateBill(+bookingId, req.user.id, dto);
  }

  @ApiOperation({ summary: 'Update order status' })
  @Patch(':bookingId/status')
  updateOrderStatus(
    @Param('bookingId') bookingId: string,
    @Request() req: { user: AuthUser },
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.fulfillmentsService.updateOrderStatus(+bookingId, req.user.id, dto);
  }

  @ApiOperation({ summary: 'Get bill history' })
  @Get(':bookingId/bill/history')
  getBillHistory(@Param('bookingId') bookingId: string) {
    return this.fulfillmentsService.getBillHistory(+bookingId);
  }
}