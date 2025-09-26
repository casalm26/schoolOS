import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type GradeDocument = Grade & Document;

export enum GradeStatus {
  Draft = 'draft',
  Pending = 'pending_release',
  Released = 'released',
}

@Schema({ _id: false, timestamps: false })
export class GradeHistoryEntry {
  @Prop({ enum: Object.values(GradeStatus) })
  status!: GradeStatus;

  @Prop({ type: Number, required: false })
  score?: number | null;

  @Prop({ type: String, required: false })
  letterGrade?: string | null;

  @Prop({ type: String, default: '' })
  feedback!: string;

  @Prop({ type: String, required: false })
  actorId?: string | null;

  @Prop({ type: Date, default: () => new Date() })
  changedAt!: Date;
}

const GradeHistorySchema = SchemaFactory.createForClass(GradeHistoryEntry);

@Schema({ timestamps: true })
export class Grade {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Assignment', required: true })
  assignmentId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  studentId!: string;

  @Prop({ type: Number, required: false })
  score?: number | null;

  @Prop({ type: String, required: false })
  letterGrade?: string | null;

  @Prop({ type: String, default: '' })
  feedback!: string;

  @Prop({ enum: Object.values(GradeStatus), default: GradeStatus.Draft })
  status!: GradeStatus;

  @Prop({ type: Date })
  releasedAt?: Date;

  @Prop({ type: [GradeHistorySchema], default: [] })
  history!: GradeHistoryEntry[];
}

export const GradeSchema = SchemaFactory.createForClass(Grade);

GradeSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
