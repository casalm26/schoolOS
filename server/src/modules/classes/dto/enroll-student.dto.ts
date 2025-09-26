import { IsEmail, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { EnrollmentStatus } from '../schemas/enrollment.schema';

export class EnrollStudentDto {
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @IsEmail()
  studentEmail?: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
