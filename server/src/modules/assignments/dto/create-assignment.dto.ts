import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AssignmentType, GradingSchema } from '../schemas/assignment.schema';

export class CreateAssignmentDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;

  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsOptional()
  @IsEnum(GradingSchema)
  gradingSchema?: GradingSchema;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxPoints?: number;
}
