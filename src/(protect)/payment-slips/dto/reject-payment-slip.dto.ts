import { IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectPaymentSlipDto {
  @ApiPropertyOptional({ description: 'เหตุผลที่ reject' })
  @IsString()
  notes?: string;
}