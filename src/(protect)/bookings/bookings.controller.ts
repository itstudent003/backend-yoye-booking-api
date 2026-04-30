import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ROLE } from '../../auth/role.constants';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryBookingDto, @Request() req) {
    return this.bookingsService.findAll(query, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.bookingsService.findOne(+id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto, @Request() req) {
    return this.bookingsService.update(+id, dto, req.user);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBookingDto, @Request() req) {
    return this.bookingsService.update(+id, dto, req.user);
  }

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Post(':id/pressers')
  assignPressers(@Param('id') id: string, @Body('presserIds') presserIds: number[], @Request() req) {
    return this.bookingsService.assignPressers(+id, presserIds ?? [], req.user);
  }

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PRESSER)
  @Get(':id/pressers')
  listPressers(@Param('id') id: string, @Request() req) {
    return this.bookingsService.listPressers(+id, req.user);
  }

  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  @Delete(':id/pressers/:presserId')
  removePresser(@Param('id') id: string, @Param('presserId') presserId: string, @Request() req) {
    return this.bookingsService.removePresser(+id, +presserId, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.bookingsService.remove(+id, req.user);
  }
}
