import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { QueryFinanceDepositsDto } from './dto/query-finance-deposits.dto';
import { QueryFinanceFeesDto } from './dto/query-finance-fees.dto';
import { QueryFinanceRefundsDto } from './dto/query-finance-refunds.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { DepositStatus } from '@prisma/client';
import { ROLE } from '../../auth/role.constants';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @ApiOperation({ summary: 'Summary cards — total deposit, used, forfeited, refunded' })
  @Get('summary')
  getSummary() {
    return this.financeService.getSummary();
  }

  @ApiOperation({ summary: 'Deposit transactions list' })
  @Get('deposits')
  getDeposits(@Query() query: QueryFinanceDepositsDto) {
    return this.financeService.getDeposits(query);
  }

  @ApiOperation({ summary: 'Deposit by booking' })
  @Get('deposits/:bookingId')
  getDepositByBooking(@Param('bookingId') bookingId: string) {
    return this.financeService.getDepositByBooking(+bookingId);
  }

  @Roles(ROLE.SUPER_ADMIN)
  @ApiOperation({ summary: 'Override deposit decision' })
  @Patch('deposits/:bookingId/override')
  overrideDeposit(
    @Param('bookingId') bookingId: string,
    @Body() body: { status: DepositStatus; usedAmount?: number; refundAmount?: number; forfeitedAmount?: number; reasonNotes?: string },
    @Request() req,
  ) {
    return this.financeService.overrideDeposit(+bookingId, body, req.user.id);
  }

  @ApiOperation({ summary: 'Verified card & service fee payment slips' })
  @Get('fees')
  getFees(@Query() query: QueryFinanceFeesDto) {
    return this.financeService.getFees(query);
  }

  @ApiOperation({ summary: 'Paid refund requests' })
  @Get('refunds')
  getRefunds(@Query() query: QueryFinanceRefundsDto) {
    return this.financeService.getRefunds(query);
  }
}
