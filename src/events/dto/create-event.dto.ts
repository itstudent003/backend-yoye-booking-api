import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { EventType, EventCategory, EventStatus } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsEnum(EventType)
  type: EventType;

  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  createdBy: number;

  @IsOptional()
  @IsNumber()
  serviceFee?: number;

  @IsOptional()
  @IsNumber()
  depositRate?: number;

  @IsOptional()
  @IsNumber()
  serviceFeeFixed?: number;
}
