import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DeepInfoFieldDto } from './create-ticket-event.dto';

export class CreateFormEventDto {
  @ApiProperty({ example: 'สมัครแข่งขัน 2026', description: 'Event name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-06-01', description: 'Event date (YYYY-MM-DD)' })
  @IsString()
  eventDate: string;

  @ApiProperty({ example: '500', description: 'Fee per entry' })
  @IsString()
  feePerEntry: string;

  @ApiPropertyOptional({ example: '200', description: 'Total capacity' })
  @IsOptional()
  @IsString()
  capacity?: string;

  @ApiPropertyOptional({ example: 'รับสมัครถึง 31 พ.ค.', description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'data:image/jpeg;base64,/9j/4AAQ...', description: 'Poster image as Base64 string' })
  @IsOptional()
  @IsString()
  posterImage?: string;

  @ApiPropertyOptional({ example: 'https://example.com/poster.jpg', description: 'Poster image URL' })
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Is event active?' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Event status (true = open, false = closed)' })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ type: [DeepInfoFieldDto], description: 'Custom info fields' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeepInfoFieldDto)
  deepInfoFields?: DeepInfoFieldDto[];
}
