import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const TRACKING_STATUSES = [
  'WAITING_SERVICE_FEE',
  'WAITING_SERVICE_FEE_VERIFY',
  'SERVICE_FEE_PAID',
] as const;

export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export class QueryOrdersDto {
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

  @ApiPropertyOptional({ description: 'Search by queue code or customer name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TRACKING_STATUSES })
  @IsOptional()
  @IsIn(TRACKING_STATUSES)
  status?: TrackingStatus;
}