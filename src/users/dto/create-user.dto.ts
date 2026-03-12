import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  line?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
