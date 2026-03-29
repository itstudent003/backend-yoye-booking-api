import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookingItemDto {
  @ApiPropertyOptional({ example: 1, description: 'ShowRound ID (for TICKET)' })
  @IsOptional()
  @IsNumber()
  roundId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Zone ID (for TICKET)' })
  @IsOptional()
  @IsNumber()
  zoneId?: number;

  @ApiPropertyOptional({ example: 'สินค้า A', description: 'Item label (for FORM)' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 1500, description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeepInfoResponseDto {
  @ApiProperty({ example: 1, description: 'DeepInfoField ID' })
  @IsNumber()
  fieldId: number;

  @ApiProperty({ example: 'John Doe', description: 'Value filled by user' })
  @IsString()
  value: string;
}

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'ID of the event' })
  @IsNumber()
  eventId: number;

  @ApiProperty({ example: 1, description: 'ID of the customer' })
  @IsNumber()
  customerId: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the show round (for TICKET)' })
  @IsOptional()
  @IsNumber()
  showRoundId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the zone (for TICKET)' })
  @IsOptional()
  @IsNumber()
  zoneId?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Net card price' })
  @IsOptional()
  @IsNumber()
  netCardPrice?: number;

  @ApiPropertyOptional({ example: 50, description: 'Service fee' })
  @IsOptional()
  @IsNumber()
  serviceFee?: number;

  @ApiPropertyOptional({ example: 100, description: 'Shipping fee' })
  @IsOptional()
  @IsNumber()
  shippingFee?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [BookingItemDto], description: 'Booking line items (ticket zones or form products)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  bookingItems?: BookingItemDto[];

  @ApiPropertyOptional({ type: [DeepInfoResponseDto], description: 'Responses to event deep info fields' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeepInfoResponseDto)
  deepInfoResponses?: DeepInfoResponseDto[];

  @ApiPropertyOptional({ description: 'Form submission data (for FORM events)' })
  @IsOptional()
  formData?: Record<string, any>;
}