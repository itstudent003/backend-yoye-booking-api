import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { QueryFinanceDepositsDto } from './dto/query-finance-deposits.dto';
import { QueryFinanceFeesDto } from './dto/query-finance-fees.dto';
import { QueryFinanceRefundsDto } from './dto/query-finance-refunds.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
