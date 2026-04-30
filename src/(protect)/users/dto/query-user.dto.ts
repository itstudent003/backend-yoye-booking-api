import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ROLE } from '../../../auth/role.constants';

export class QueryUserDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (starts at 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ example: 'john', description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PRESSER],
    description: 'Filter by user role',
  })
  @IsOptional()
  @IsString()
  @IsIn([ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.PRESSER])
  role?: string;
}
