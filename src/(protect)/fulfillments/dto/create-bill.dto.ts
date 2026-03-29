import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FulfillmentType } from '@prisma/client';

export class CreateBillDto {
  @ApiProperty({ enum: FulfillmentType })
  @IsNotEmpty()
  @IsEnum(FulfillmentType)
  type: FulfillmentType;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  serviceFee: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  shippingFee: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}