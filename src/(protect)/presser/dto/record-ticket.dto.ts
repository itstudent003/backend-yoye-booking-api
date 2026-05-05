import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RecordTicketDto {
  @ApiPropertyOptional({ description: 'รอบการแสดงที่เลือก ใช้ตรวจฝั่งหน้าเว็บเท่านั้น โซนจะผูกกับรอบอยู่แล้ว' })
  @IsOptional()
  @IsNumber()
  roundId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  zoneId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneNameRaw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneName?: string;

  @ApiProperty()
  @IsString()
  seat: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
