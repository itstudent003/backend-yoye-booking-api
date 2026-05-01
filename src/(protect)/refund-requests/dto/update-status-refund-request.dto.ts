import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RefundStatus } from '@prisma/client';

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
}
