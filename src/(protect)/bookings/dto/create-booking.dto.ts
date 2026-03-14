import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'Q-123456', description: 'Queue code for the booking' })
  @IsString()
  queueCode: string;

  @ApiProperty({ example: 1, description: 'ID of the event' })
  @IsNumber()
  eventId: number;

  @ApiProperty({ example: 1, description: 'ID of the customer' })
  @IsNumber()
  customerId: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the assigned admin' })
  @IsOptional()
  @IsNumber()
  assignedAdminId?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Total amount' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 50, description: 'Service fee' })
  @IsOptional()
  @IsNumber()
  serviceFee?: number;

  @ApiPropertyOptional({ example: 100, description: 'Shipping fee' })
  @IsOptional()
  @IsNumber()
  shippingFee?: number;

  @ApiPropertyOptional({ example: 'Please handle with care', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
