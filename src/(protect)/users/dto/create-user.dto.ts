import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'สมชาย', description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'ใจดี', description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '@somchai', description: 'LINE ID' })
  @IsOptional()
  @IsString()
  line?: string;

  @ApiPropertyOptional({ example: '0812345678', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: AdminRole, example: AdminRole.ADMIN, description: 'Admin role' })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
