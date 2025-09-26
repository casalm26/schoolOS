import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClassDto {
  @IsMongoId()
  cohortId!: string;

  @IsString()
  title!: string;

  @IsString()
  code!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsMongoId({ each: true })
  instructorIds!: string[];

  @IsOptional()
  @IsObject()
  scheduleMeta?: Record<string, any>;
}
