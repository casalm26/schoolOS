import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReleaseGradeDto {
  @IsOptional()
  @IsDateString()
  releaseAt?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}
