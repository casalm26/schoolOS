import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { GradeStatus } from '../schemas/grade.schema';

export class UpsertGradeDto {
  @IsMongoId()
  studentId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  score?: number;

  @IsOptional()
  @IsString()
  letterGrade?: string;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsEnum(GradeStatus)
  status?: GradeStatus;
}
