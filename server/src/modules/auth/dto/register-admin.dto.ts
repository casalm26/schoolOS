import { IsEmail, MinLength, IsString } from 'class-validator';

export class RegisterAdminDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}
