import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { FulfillmentType, DeliveryStatus } from '@prisma/client';

export class UpdateFulfillmentDto {
  @IsOptional()
  @IsEnum(FulfillmentType)
  type?: FulfillmentType;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @IsOptional()
  @IsDateString()
  pickupDateTime?: string;

  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

  @IsOptional()
  @IsString()
  shippingPostal?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsNumber()
  shippingFee?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
