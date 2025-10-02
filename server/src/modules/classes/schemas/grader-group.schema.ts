import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type GraderGroupDocument = GraderGroup & Document;

@Schema({ timestamps: true })
export class GraderGroup {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'ClassEntity', required: true })
  classId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User', default: [] })
  graderIds!: string[];
}

export const GraderGroupSchema = SchemaFactory.createForClass(GraderGroup);

GraderGroupSchema.index({ classId: 1, name: 1 }, { unique: true });
