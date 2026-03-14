import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateTicketEventDto } from './dto/create-ticket-event.dto';
import { CreateFormEventDto } from './dto/create-form-event.dto';
import { UpdateTicketEventDto } from './dto/update-ticket-event.dto';
import { UpdateFormEventDto } from './dto/update-form-event.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
}

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @ApiOperation({ summary: 'Create a TICKET type event with show rounds and zones' })
  @Post('ticket')
  createTicket(@Body() dto: CreateTicketEventDto, @Request() req: { user: AuthUser }) {
    return this.eventsService.createTicket(dto, req.user);
  }

  @ApiOperation({ summary: 'Create a FORM type event' })
  @Post('form')
  createForm(@Body() dto: CreateFormEventDto, @Request() req: { user: AuthUser }) {
    return this.eventsService.createForm(dto, req.user);
  }

  @ApiOperation({ summary: 'Get all events' })
  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @ApiOperation({ summary: 'Get event by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update a TICKET type event' })
  @Patch('ticket/:id')
  updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketEventDto, @Request() req: { user: AuthUser }) {
    return this.eventsService.updateTicket(+id, dto, req.user);
  }

  @ApiOperation({ summary: 'Update a FORM type event' })
  @Patch('form/:id')
  updateForm(@Param('id') id: string, @Body() dto: UpdateFormEventDto, @Request() req: { user: AuthUser }) {
    return this.eventsService.updateForm(+id, dto, req.user);
  }

  @ApiOperation({ summary: 'Soft delete event (sets isActive = false)' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.eventsService.remove(+id, req.user);
  }
}
