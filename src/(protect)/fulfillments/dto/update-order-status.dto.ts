import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TRACKING_STATUSES, TrackingStatus } from './query-orders.dto';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: TRACKING_STATUSES })
  @IsNotEmpty()
  @IsIn(TRACKING_STATUSES)
  status: TrackingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}