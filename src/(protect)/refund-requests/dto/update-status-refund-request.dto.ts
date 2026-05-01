import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { RefundCategory, RefundStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateStatusRefundRequestDto {
  @ApiProperty({ enum: RefundStatus })
  @IsNotEmpty()
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payoutSlipUrl?: string;

  @ApiPropertyOptional({ description: 'วันและเวลาโอนคืนจริงตามสลิป' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ enum: RefundCategory })
  @IsOptional()
  @IsEnum(RefundCategory)
  category?: RefundCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  breakdown?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payoutReference?: string;
}
