import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentSlipStatus, PaymentSlipType } from '@prisma/client';

export class QueryPaymentSlipDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({ enum: PaymentSlipType })
  @IsOptional()
  @IsEnum(PaymentSlipType)
  type?: PaymentSlipType;

  @ApiPropertyOptional({ enum: PaymentSlipStatus })
  @IsOptional()
  @IsEnum(PaymentSlipStatus)
  status?: PaymentSlipStatus;

  @ApiPropertyOptional({ example: 1, description: 'Filter by event ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  eventId?: number;

  @ApiPropertyOptional({ example: 'Q-001', description: 'Search by queue code or customer name' })
  @IsOptional()
  @IsString()
  search?: string;
}