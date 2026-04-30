import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory, ExpensePaidBy } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bookingId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  eventId?: number;

  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: ExpensePaidBy })
  @IsEnum(ExpensePaidBy)
  paidBy: ExpensePaidBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
