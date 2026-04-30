import { Body, Controller, Get, Patch, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ROLE } from '../../auth/role.constants';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseStatusDto } from './dto/update-expense-status.dto';
import { ExpensesService } from './expenses.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PRESSER)
  @Post()
  submit(@Body() dto: CreateExpenseDto, @Request() req) {
    return this.expensesService.submit(dto, req.user.id);
  }

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.expensesService.findAll();
  }

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PRESSER)
  @Get('mine')
  mine(@Request() req) {
    return this.expensesService.findMine(req.user.id);
  }

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateExpenseStatusDto, @Request() req) {
    return this.expensesService.updateStatus(+id, dto, req.user.id);
  }

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Get('settlement')
  settlement(@Query('from') from?: string, @Query('to') to?: string) {
    return this.expensesService.getSettlement(from, to);
  }
}
