import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  queueCode: string;

  @IsNumber()
  eventId: number;

  @IsNumber()
  customerId: number;

  @IsOptional()
  @IsNumber()
  assignedAdminId?: number;

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
  @IsString()
  notes?: string;
}
