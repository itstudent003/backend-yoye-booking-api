import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  lineId?: string;
}
