import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateGraderGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  graderIds?: string[];
}
