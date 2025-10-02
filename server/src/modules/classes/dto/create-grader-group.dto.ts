import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateGraderGroupDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsMongoId({ each: true })
  graderIds!: string[];
}
