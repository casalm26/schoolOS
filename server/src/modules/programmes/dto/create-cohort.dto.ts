import { IsDateString, IsMongoId, IsString } from 'class-validator';

export class CreateCohortDto {
  @IsMongoId()
  programmeId!: string;

  @IsString()
  label!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;
}
