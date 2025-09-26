import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationChannel {
  Email = 'email',
  InApp = 'in_app',
}

export enum NotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ type: Object, default: {} })
  payload!: Record<string, unknown>;

  @Prop({ enum: Object.values(NotificationChannel), default: NotificationChannel.Email })
  channel!: NotificationChannel;

  @Prop({ enum: Object.values(NotificationStatus), default: NotificationStatus.Pending })
  status!: NotificationStatus;

  @Prop({ type: Date, required: false })
  sentAt?: Date;

  @Prop({ type: String, required: false })
  error?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
