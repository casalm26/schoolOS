import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateStudentGroupDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  memberIds?: string[];
}
