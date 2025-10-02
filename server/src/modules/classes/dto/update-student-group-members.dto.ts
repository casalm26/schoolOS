import { IsArray, IsMongoId } from 'class-validator';

export class UpdateStudentGroupMembersDto {
  @IsArray()
  @IsMongoId({ each: true })
  memberIds!: string[];
}
