import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type GroupBundleDocument = GroupBundle & Document;

@Schema({ timestamps: true })
export class GroupBundle {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'ClassEntity', required: true })
  classId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'StudentGroup', required: true })
  studentGroupId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'GraderGroup', required: true })
  graderGroupId!: string;

  @Prop({ default: '' })
  notes!: string;
}

export const GroupBundleSchema = SchemaFactory.createForClass(GroupBundle);

GroupBundleSchema.index(
  { classId: 1, studentGroupId: 1, graderGroupId: 1 },
  { unique: true },
);
