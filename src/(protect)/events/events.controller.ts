import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { eventImageStorage, imageFileFilter } from '../../common/utils/file-upload.util';
import { EventsService } from './events.service';
import { CreateTicketEventDto } from './dto/create-ticket-event.dto';
import { CreateFormEventDto } from './dto/create-form-event.dto';
import { UpdateTicketEventDto } from './dto/update-ticket-event.dto';
import { UpdateFormEventDto } from './dto/update-form-event.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EventType } from '@prisma/client';

interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
}

const fileUploadOptions = { storage: eventImageStorage, fileFilter: imageFileFilter };

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @ApiOperation({ summary: 'Create a TICKET type event with show rounds and zones' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateTicketEventDto })
  @UseInterceptors(FileInterceptor('posterImage', fileUploadOptions))
  @Post('ticket')
  createTicket(
    @Body() dto: CreateTicketEventDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: AuthUser },
  ) {
    return this.eventsService.createTicket(dto, req.user, file);
  }

  @ApiOperation({ summary: 'Create a FORM type event' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateFormEventDto })
  @UseInterceptors(FileInterceptor('posterImage', fileUploadOptions))
  @Post('form')
  createForm(
    @Body() dto: CreateFormEventDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: AuthUser },
  ) {
    return this.eventsService.createForm(dto, req.user, file);
  }

  @ApiOperation({ summary: 'Get all events' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', enum: EventType, required: false })
  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('search') search?: string,
    @Query('type') type?: EventType,
  ) {
    return this.eventsService.findAll(+page, +pageSize, search, type);
  }

  @ApiOperation({ summary: 'Get pressers assigned to bookings in an event' })
  @Get(':id/pressers')
  findPressers(@Param('id') id: string) {
    return this.eventsService.findPressers(+id);
  }

  @ApiOperation({ summary: 'Assign pressers to an event before bookings exist' })
  @Post(':id/pressers')
  assignPressers(
    @Param('id') id: string,
    @Body('presserIds') presserIds: number[],
    @Request() req: { user: AuthUser },
  ) {
    return this.eventsService.assignPressers(+id, presserIds ?? [], req.user);
  }

  @ApiOperation({ summary: 'Remove a presser from all bookings in an event' })
  @Delete(':id/pressers/:presserId')
  removePresser(@Param('id') id: string, @Param('presserId') presserId: string, @Request() req: { user: AuthUser }) {
    return this.eventsService.removePresser(+id, +presserId, req.user);
  }

  @ApiOperation({ summary: 'Get event by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update a TICKET type event' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateTicketEventDto })
  @UseInterceptors(FileInterceptor('posterImage', fileUploadOptions))
  @Patch('ticket/:id')
  updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketEventDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: AuthUser },
  ) {
    return this.eventsService.updateTicket(+id, dto, req.user, file);
  }

  @ApiOperation({ summary: 'Update a FORM type event' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateFormEventDto })
  @UseInterceptors(FileInterceptor('posterImage', fileUploadOptions))
  @Patch('form/:id')
  updateForm(
    @Param('id') id: string,
    @Body() dto: UpdateFormEventDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: AuthUser },
  ) {
    return this.eventsService.updateForm(+id, dto, req.user, file);
  }

  @ApiOperation({ summary: 'Soft delete event (sets isActive = false)' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.eventsService.remove(+id, req.user);
  }
}
