import { PartialType } from '@nestjs/swagger';
import { CreateFormEventDto } from './create-form-event.dto';

export class UpdateFormEventDto extends PartialType(CreateFormEventDto) {}
