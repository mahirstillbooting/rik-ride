import { Schema, model, Document, Types } from 'mongoose';

export type SavedLocationType = 'HOME' | 'WORK' | 'FAVORITE';

export interface ISavedLocation extends Document {
  userId: Types.ObjectId;
  name: string;
  address: string;
  type: SavedLocationType;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}

const SavedLocationSchema = new Schema<ISavedLocation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['HOME', 'WORK', 'FAVORITE'],
      default: 'FAVORITE',
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

SavedLocationSchema.index({ userId: 1, name: 1 });

export const SavedLocation = model<ISavedLocation>('SavedLocation', SavedLocationSchema);
