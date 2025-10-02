import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type StudentGroupDocument = StudentGroup & Document;

@Schema({ timestamps: true })
export class StudentGroup {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'ClassEntity', required: true })
  classId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User', default: [] })
  memberIds!: string[];
}

export const StudentGroupSchema = SchemaFactory.createForClass(StudentGroup);

StudentGroupSchema.index({ classId: 1, name: 1 }, { unique: true });
