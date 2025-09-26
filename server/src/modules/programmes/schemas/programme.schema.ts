import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProgrammeDocument = Programme & Document;

@Schema({ timestamps: true })
export class Programme {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;
}

export const ProgrammeSchema = SchemaFactory.createForClass(Programme);
