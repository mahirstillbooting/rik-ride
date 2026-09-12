import { Schema, model, Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'GARAGE_OWNER' | 'DRIVER' | 'PASSENGER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export interface IUser extends Document {
  phone: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  profileImage?: string;
  email?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['ADMIN', 'GARAGE_OWNER', 'DRIVER', 'PASSENGER'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    profileImage: { type: String },
    email: { type: String, trim: true, lowercase: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', UserSchema);
