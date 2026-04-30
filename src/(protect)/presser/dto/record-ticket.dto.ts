import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RecordTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  zoneId?: number;

  @ApiProperty()
  @IsString()
  zoneNameRaw: string;

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
