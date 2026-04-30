import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateExpenseStatusDto {
  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsEnum(ExpenseStatus)
  status: ExpenseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectedNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  settlementNote?: string;
}
