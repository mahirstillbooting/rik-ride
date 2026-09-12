import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'RIDE_UPDATE' | 'GARAGE_UPDATE' | 'SAFETY_ALERT' | 'SYSTEM';

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  readStatus: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['RIDE_UPDATE', 'GARAGE_UPDATE', 'SAFETY_ALERT', 'SYSTEM'],
      required: true,
    },
    readStatus: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipientId: 1, readStatus: 1 });

export const Notification = model<INotification>('Notification', NotificationSchema);
