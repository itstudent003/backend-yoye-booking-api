import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('alerts')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAlerts(@Query('limit') limit?: string) {
    return this.dashboardService.getAlerts(limit ? +limit : 10);
  }

  @Get('actions')
  getActions() {
    return this.dashboardService.getActions();
  }

  @Get('activity')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getActivity(@Query('limit') limit?: string) {
    return this.dashboardService.getActivity(limit ? +limit : 10);
  }
}
