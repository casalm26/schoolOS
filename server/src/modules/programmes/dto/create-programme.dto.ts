import { IsOptional, IsString } from 'class-validator';

export class CreateProgrammeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
