import { Schema, model, Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'GARAGE_OWNER' | 'DRIVER' | 'PASSENGER';
export type DriverOperatingMode = 'GARAGE_REGISTERED' | 'SELF_OWNED';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'DISABLED';

export interface IUser extends Document {
  phone: string;
  name: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  driverMode?: DriverOperatingMode; // Applies when role === 'DRIVER'
  accountStatus: AccountStatus;
  profileImage?: string;
  lastLoginAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  toAuthJSON(): Record<string, unknown>;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['ADMIN', 'GARAGE_OWNER', 'DRIVER', 'PASSENGER'],
      required: true,
      index: true,
    },
    driverMode: {
      type: String,
      enum: ['GARAGE_REGISTERED', 'SELF_OWNED'],
      index: true,
    },
    accountStatus: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'DISABLED'],
      default: 'PENDING',
      index: true,
    },
    profileImage: { type: String },
    lastLoginAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.toAuthJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

export const User = model<IUser>('User', UserSchema);
