import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RefundRequestsService } from './refund-requests.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { QueryRefundRequestDto } from './dto/query-refund-request.dto';
import { UpdateStatusRefundRequestDto } from './dto/update-status-refund-request.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RefundStatus } from '@prisma/client';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ROLE } from '../../auth/role.constants';

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
}

@ApiTags('Refund Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('refund-requests')
export class RefundRequestsController {
  constructor(private readonly refundRequestsService: RefundRequestsService) {}

  @ApiOperation({ summary: 'Create a refund request' })
  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateRefundRequestDto) {
    return this.refundRequestsService.create(dto);
  }

  @ApiOperation({ summary: 'Get all refund requests with optional pagination' })
  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RefundStatus })
  @ApiQuery({ name: 'eventId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, description: 'Search by queue code or customer name' })
  @Get()
  findAll(@Query() query: QueryRefundRequestDto) {
    return this.refundRequestsService.findAll(query);
  }

  @ApiOperation({ summary: 'Suggest refund breakdown from booking/payment data' })
  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Get('suggest/:bookingCode')
  suggest(@Param('bookingCode') bookingCode: string) {
    return this.refundRequestsService.suggest(bookingCode);
  }

  @ApiOperation({ summary: 'Get refund requests by booking ID' })
  @Get('booking/:bookingId')
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.refundRequestsService.findByBooking(+bookingId);
  }

  @ApiOperation({ summary: 'Get refund request by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundRequestsService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update refund request status' })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
    @Body() dto: UpdateStatusRefundRequestDto,
  ) {
    return this.refundRequestsService.updateStatus(+id, dto, req.user.id);
  }
}
