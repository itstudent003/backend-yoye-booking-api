import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { BookingStatus, PaymentStatus } from '@prisma/client';

export class UpdateBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  serviceFee?: number;

  @IsOptional()
  @IsNumber()
  shippingFee?: number;

  @IsOptional()
  @IsNumber()
  depositPaid?: number;

  @IsOptional()
  @IsNumber()
  totalPaid?: number;

  @IsOptional()
  @IsNumber()
  assignedAdminId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
