import { Schema, model, Document } from 'mongoose';

export type OtpPurpose = 'FORGOT_PASSWORD' | 'EMAIL_VERIFICATION';

export interface IOtpRecord extends Document {
  email: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  resendCooldownUntil: Date;
  resetTokenHash?: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OtpRecordSchema = new Schema<IOtpRecord>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['FORGOT_PASSWORD', 'EMAIL_VERIFICATION'],
      required: true,
      index: true,
    },
    attempts: { type: Number, default: 0 },
    resendCooldownUntil: { type: Date, required: true },
    resetTokenHash: { type: String, sparse: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL Index
    isUsed: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

export const OtpRecord = model<IOtpRecord>('OtpRecord', OtpRecordSchema);
