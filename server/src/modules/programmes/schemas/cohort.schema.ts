import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type CohortDocument = Cohort & Document;

@Schema({ timestamps: true })
export class Cohort {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Programme', required: true })
  programmeId!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ type: Date, required: true })
  startAt!: Date;

  @Prop({ type: Date, required: true })
  endAt!: Date;
}

export const CohortSchema = SchemaFactory.createForClass(Cohort);

CohortSchema.index({ programmeId: 1, label: 1 }, { unique: true });
