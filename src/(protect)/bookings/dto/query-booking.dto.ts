import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '@prisma/client';

export class QueryBookingDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (starts at 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ example: 'คอนเสิร์ต', description: 'Search by queue code, booking code, customer name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by event ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  eventId?: number;

  @ApiPropertyOptional({ enum: BookingStatus, description: 'Filter by booking status' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}