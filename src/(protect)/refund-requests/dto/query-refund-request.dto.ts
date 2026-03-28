import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RefundStatus } from '@prisma/client';

export class QueryRefundRequestDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ example: 1, description: 'Filter by event ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  eventId?: number;

  @ApiPropertyOptional({ description: 'Search by queue code, booking code or customer name' })
  @IsOptional()
  @IsString()
  search?: string;
}