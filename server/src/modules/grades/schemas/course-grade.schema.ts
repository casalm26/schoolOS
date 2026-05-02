import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type CourseGradeDocument = CourseGrade & Document;

@Schema({ timestamps: true, collection: 'course_grades' })
export class CourseGrade {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'ClassEntity', required: true, index: true })
  classId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  studentId!: string;

  @Prop({ trim: true, default: null })
  letterGrade!: string | null;

  @Prop({ default: null })
  score!: number | null;

  @Prop({ trim: true, default: '' })
  feedback!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  gradedBy!: string | null;
}

export const CourseGradeSchema = SchemaFactory.createForClass(CourseGrade);
CourseGradeSchema.index({ classId: 1, studentId: 1 }, { unique: true });
