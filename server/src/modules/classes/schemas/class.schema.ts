import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type ClassDocument = ClassEntity & Document;

@Schema({ timestamps: true, collection: 'classes' })
export class ClassEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cohort', required: true })
  cohortId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code!: string;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User', default: [] })
  instructorIds!: string[];

  @Prop({ type: Object, default: {} })
  scheduleMeta!: Record<string, any>;
}

export const ClassSchema = SchemaFactory.createForClass(ClassEntity);

ClassSchema.index({ cohortId: 1 });
