import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentSlipType } from '@prisma/client';

export class CreatePaymentSlipDto {
  @IsNumber()
  bookingId: number;

  @IsEnum(PaymentSlipType)
  type: PaymentSlipType;

  @IsNumber()
  systemAmount: number;

  @IsNumber()
  slipAmount: number;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
