import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateGroupBundleDto {
  @IsMongoId()
  studentGroupId!: string;

  @IsMongoId()
  graderGroupId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
