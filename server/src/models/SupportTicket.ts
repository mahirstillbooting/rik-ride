import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from './User';

export type TicketRequestType = 'IDENTITY_CHANGE' | 'GENERAL_SUPPORT' | 'GARAGE_CHANGE' | 'ACCOUNT_INQUIRY';
export type TicketRequestedField = 'name' | 'dateOfBirth' | 'nidNumber' | 'address' | 'other';
export type TicketStatus = 'OPEN' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';

export interface ISupportTicket extends Document {
  ticketId: string;
  userId: Types.ObjectId;
  userRole: UserRole;
  requestType: TicketRequestType;
  requestedField: TicketRequestedField;
  currentValue?: string;
  proposedValue: string;
  reason: string;
  supportingDocumentRef?: string;
  status: TicketStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  resolutionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userRole: {
      type: String,
      enum: ['ADMIN', 'GARAGE_OWNER', 'DRIVER', 'PASSENGER'],
      required: true,
    },
    requestType: {
      type: String,
      enum: ['IDENTITY_CHANGE', 'GENERAL_SUPPORT', 'GARAGE_CHANGE', 'ACCOUNT_INQUIRY'],
      default: 'IDENTITY_CHANGE',
      index: true,
    },
    requestedField: {
      type: String,
      enum: ['name', 'dateOfBirth', 'nidNumber', 'address', 'other'],
      required: true,
    },
    currentValue: { type: String, trim: true },
    proposedValue: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    supportingDocumentRef: { type: String, trim: true },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    resolutionReason: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

export const SupportTicket = model<ISupportTicket>('SupportTicket', SupportTicketSchema);
