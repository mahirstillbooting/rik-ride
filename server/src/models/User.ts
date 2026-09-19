import { Schema, model, Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'GARAGE_OWNER' | 'DRIVER' | 'PASSENGER';
export type DriverOperatingMode = 'GARAGE_REGISTERED' | 'SELF_OWNED';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'DISABLED';
export type NidStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface IUser extends Document {
  phone: string;
  name: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  driverMode?: DriverOperatingMode; // Applies when role === 'DRIVER'
  accountStatus: AccountStatus;
  
  // Mandatory NID & Identity Fields
  nidNumber?: string;
  dateOfBirth?: Date | string;
  nidStatus?: NidStatus;
  nidDocumentRef?: string;
  nidFrontDocumentRef?: string;
  nidBackDocumentRef?: string;
  city?: string;
  cityCode?: string;
  area?: string;
  address?: string;
  isIdentityProtected?: boolean;

  profileImage?: string;
  rejectionReason?: string;
  rejectionDate?: Date;
  pushToken?: string;
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

    // Mandatory NID & Identity Fields
    nidNumber: { type: String, trim: true, sparse: true, index: true },
    dateOfBirth: { type: Schema.Types.Mixed },
    nidStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    nidDocumentRef: { type: String },
    nidFrontDocumentRef: { type: String },
    nidBackDocumentRef: { type: String },
    city: { type: String, default: 'Dhaka', trim: true },
    cityCode: { type: String, default: 'DH', uppercase: true, trim: true },
    area: { type: String, trim: true },
    address: { type: String, trim: true },
    isIdentityProtected: { type: Boolean, default: true },

    profileImage: { type: String },
    rejectionReason: { type: String, trim: true },
    rejectionDate: { type: Date },
    pushToken: { type: String, trim: true },
    lastLoginAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ role: 1, accountStatus: 1 });

UserSchema.methods.toAuthJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

export const User = model<IUser>('User', UserSchema);
