import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'สมหญิง ใจงาม', description: 'Full name of the customer' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: 'หญิง', description: 'Nickname' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ example: 'customer@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0812345678', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '@ying', description: 'LINE ID' })
  @IsOptional()
  @IsString()
  lineId?: string;
}
