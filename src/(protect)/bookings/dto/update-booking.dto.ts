import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { BookingItemDto, DeepInfoResponseDto } from './create-booking.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
  showRoundId?: number;

  @IsOptional()
  @IsNumber()
  zoneId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [BookingItemDto], description: 'Replace booking items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  bookingItems?: BookingItemDto[];

  @ApiPropertyOptional({ type: [DeepInfoResponseDto], description: 'Replace deep info responses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeepInfoResponseDto)
  deepInfoResponses?: DeepInfoResponseDto[];

  @ApiPropertyOptional({ description: 'Form submission data (for FORM events)' })
  @IsOptional()
  formData?: Record<string, any>;
}