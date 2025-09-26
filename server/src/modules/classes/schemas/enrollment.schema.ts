import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

export enum EnrollmentStatus {
  Active = 'active',
  Completed = 'completed',
  Dropped = 'dropped',
}

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'ClassEntity', required: true })
  classId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  studentId!: string;

  @Prop({ enum: Object.values(EnrollmentStatus), default: EnrollmentStatus.Active })
  status!: EnrollmentStatus;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);

EnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });
