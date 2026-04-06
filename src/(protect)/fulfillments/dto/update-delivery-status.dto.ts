import { ApiProperty } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: DeliveryStatus })
  @IsNotEmpty()
  @IsEnum(DeliveryStatus)
  deliveryStatus: DeliveryStatus;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  note: string;
}
