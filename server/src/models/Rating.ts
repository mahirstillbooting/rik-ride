import { Schema, model, Document, Types } from 'mongoose';

export interface IRating extends Document {
  rideId: Types.ObjectId;
  raterId: Types.ObjectId;
  ratedId: Types.ObjectId;
  rating: number; // 1 to 5
  comment?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    rideId: { type: Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
    raterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ratedId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

RatingSchema.index({ rideId: 1, raterId: 1 }, { unique: true });

export const Rating = model<IRating>('Rating', RatingSchema);
