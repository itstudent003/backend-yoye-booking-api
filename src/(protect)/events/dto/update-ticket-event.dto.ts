import { PartialType } from '@nestjs/swagger';
import { CreateTicketEventDto } from './create-ticket-event.dto';

export class UpdateTicketEventDto extends PartialType(CreateTicketEventDto) {}
