import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  Admin = 'admin',
  Teacher = 'teacher',
  Student = 'student',
}

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform: (_doc, ret: any) => {
      delete ret.passwordHash;
      delete ret.resetToken;
      delete ret.resetTokenExpiresAt;
      return ret;
    },
  },
  toObject: {
    versionKey: false,
    transform: (_doc, ret: any) => {
      delete ret.passwordHash;
      delete ret.resetToken;
      delete ret.resetTokenExpiresAt;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, enum: Object.values(UserRole) })
  role!: UserRole;

  @Prop({ required: true, enum: Object.values(UserStatus), default: UserStatus.Active })
  status!: UserStatus;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: String })
  resetToken?: string | null;

  @Prop({ type: Date })
  resetTokenExpiresAt?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
