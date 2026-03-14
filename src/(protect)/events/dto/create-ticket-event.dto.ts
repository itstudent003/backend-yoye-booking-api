import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FulfillmentType } from '@prisma/client';

export class TicketZoneDto {
  @ApiProperty({ example: 'VIP', description: 'Zone name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2500', description: 'Ticket price' })
  @IsString()
  price: string;

  @ApiProperty({ example: '100', description: 'Service fee' })
  @IsString()
  fee: string;

  @ApiProperty({ example: '200', description: 'Zone capacity' })
  @IsString()
  capacity: string;
}

export class ShowRoundDto {
  @ApiProperty({ example: 'รอบเย็น', description: 'Round name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-06-01', description: 'Show date (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ example: '18:00', description: 'Show time (HH:mm)' })
  @IsString()
  time: string;

  @ApiProperty({ type: [TicketZoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketZoneDto)
  zones: TicketZoneDto[];
}

export class DeepInfoFieldDto {
  @ApiPropertyOptional({ example: 'other1', description: 'Other code reference' })
  @IsOptional()
  @IsString()
  otherCode?: string;

  @ApiProperty({ example: 'ชื่อผู้ซื้อ', description: 'Field label' })
  @IsString()
  label: string;

  @ApiProperty({ example: true, description: 'Is this field required?' })
  @IsBoolean()
  isRequired: boolean;
}

export class CreateTicketEventDto {
  @ApiProperty({ example: 'BNK48 Concert 2026', description: 'Event name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'data:image/jpeg;base64,/9j/4AAQ...', description: 'Poster image as Base64 string' })
  @IsOptional()
  @IsString()
  posterImage?: string;


  @ApiPropertyOptional({ example: 'https://example.com/poster.jpg', description: 'Poster image URL' })
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiPropertyOptional({ example: 'ที่นั่งจำกัด', description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true, description: 'Event status (true = open, false = closed)' })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiProperty({ type: [ShowRoundDto], description: 'Show rounds with zones' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShowRoundDto)
  showRounds: ShowRoundDto[];

  @ApiPropertyOptional({ type: [DeepInfoFieldDto], description: 'Custom info fields' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeepInfoFieldDto)
  deepInfoFields?: DeepInfoFieldDto[];
}
