import { Schema, model, Document, Types } from 'mongoose';

export type SettlementStatus = 'PENDING' | 'SETTLED' | 'DISPUTED';

export interface ISettlementRecord extends Document {
  rideId: Types.ObjectId;
  driverId: Types.ObjectId;
  garageId?: Types.ObjectId;
  fareAmount: number;
  platformCommission: number;
  garageCommission?: number;
  driverEarnings: number;
  status: SettlementStatus;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementRecordSchema = new Schema<ISettlementRecord>(
  {
    rideId: { type: Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', index: true },
    fareAmount: { type: Number, required: true },
    platformCommission: { type: Number, required: true },
    garageCommission: { type: Number, default: 0 },
    driverEarnings: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'SETTLED', 'DISPUTED'],
      default: 'PENDING',
      index: true,
    },
    settledAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const SettlementRecord = model<ISettlementRecord>('SettlementRecord', SettlementRecordSchema);
