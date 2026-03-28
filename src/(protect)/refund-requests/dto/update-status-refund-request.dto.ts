import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
}