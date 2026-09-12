import { Schema, model, Document, Types } from 'mongoose';

export type GarageDriverStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface IGarageDriver extends Document {
  garageId: Types.ObjectId;
  driverId: Types.ObjectId;
  status: GarageDriverStatus;
  assignedAt: Date;
  terminatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GarageDriverSchema = new Schema<IGarageDriver>(
  {
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'TERMINATED'],
      default: 'ACTIVE',
      index: true,
    },
    assignedAt: { type: Date, default: Date.now },
    terminatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

GarageDriverSchema.index({ garageId: 1, driverId: 1 }, { unique: true });

export const GarageDriver = model<IGarageDriver>('GarageDriver', GarageDriverSchema);
