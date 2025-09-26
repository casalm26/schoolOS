import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type AssignmentDocument = Assignment & Document;

export enum AssignmentType {
  Project = 'project',
  Task = 'task',
  Test = 'test',
}

export enum GradingSchema {
  Points = 'points',
  Percentage = 'percentage',
  PassFail = 'pass_fail',
}

@Schema({ timestamps: true })
export class Assignment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'ClassEntity', required: true })
  classId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ enum: Object.values(AssignmentType), default: AssignmentType.Task })
  type!: AssignmentType;

  @Prop({ type: Date, required: true })
  dueAt!: Date;

  @Prop({ type: Date })
  publishAt?: Date;

  @Prop({ enum: Object.values(GradingSchema), default: GradingSchema.Points })
  gradingSchema!: GradingSchema;

  @Prop({ type: Number, default: 100 })
  maxPoints!: number;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

AssignmentSchema.index({ classId: 1, dueAt: 1 });
