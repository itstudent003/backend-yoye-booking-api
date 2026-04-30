import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ROLE } from '../../auth/role.constants';
import { PresserService } from './presser.service';
import { RecordTicketDto } from './dto/record-ticket.dto';
import { UpdatePresserStatusDto } from './dto/update-presser-status.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('presser')
export class PresserController {
  constructor(private presserService: PresserService) {}

  @Roles(ROLE.PRESSER, ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Get('bookings')
  listBookings(@Request() req, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.presserService.listBookings(req.user, page ? +page : 1, pageSize ? +pageSize : 20);
  }

  @Roles(ROLE.PRESSER, ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Get('bookings/:id')
  getBooking(@Param('id') id: string, @Request() req) {
    return this.presserService.getBooking(+id, req.user);
  }

  @Roles(ROLE.PRESSER)
  @Patch('bookings/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePresserStatusDto, @Request() req) {
    return this.presserService.updateStatus(+id, dto, req.user);
  }

  @Roles(ROLE.PRESSER, ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Post('bookings/:id/tickets')
  recordTickets(@Param('id') id: string, @Body() dto: RecordTicketDto | RecordTicketDto[], @Request() req) {
    return this.presserService.recordTickets(+id, dto, req.user);
  }

  @Roles(ROLE.PRESSER, ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Post('bookings/:id/tickets/bulk')
  replaceTickets(@Param('id') id: string, @Body() dto: RecordTicketDto[], @Request() req) {
    return this.presserService.replaceTickets(+id, dto, req.user);
  }

  @Roles(ROLE.PRESSER, ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Patch('bookings/:id/tickets/:ticketId')
  updateTicket(@Param('id') id: string, @Param('ticketId') ticketId: string, @Body() dto: Partial<RecordTicketDto>, @Request() req) {
    return this.presserService.updateTicket(+id, +ticketId, dto, req.user);
  }

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Delete('bookings/:id/tickets/:ticketId')
  voidTicket(@Param('id') id: string, @Param('ticketId') ticketId: string, @Request() req) {
    return this.presserService.voidTicket(+id, +ticketId, req.user);
  }
}
