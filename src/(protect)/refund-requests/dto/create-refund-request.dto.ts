import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const REFUND_CATEGORY = {
  TICKET: 'TICKET',
  DEPOSIT: 'DEPOSIT',
  PRICE_DIFF: 'PRICE_DIFF',
  SHIPPING: 'SHIPPING',
  MIXED: 'MIXED',
} as const;

type RefundCategoryValue = (typeof REFUND_CATEGORY)[keyof typeof REFUND_CATEGORY];

export class CreateRefundRequestDto {
  @ApiProperty({ example: '25-ABC123', description: 'Unique booking code' })
  @IsNotEmpty()
  @IsString()
  bookingCode: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  accountHolder: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: REFUND_CATEGORY })
  @IsOptional()
  @IsEnum(REFUND_CATEGORY)
  category?: RefundCategoryValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  breakdown?: Record<string, number>;
}
